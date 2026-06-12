import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { obsManager } from './obs-manager';
import { chatWithAI } from './ai/serviceManager';
import dotenv from 'dotenv';
import type { AIRecommendationExplanationRequest, AIRecommendationRequest } from '../shared/types';
import { getLocalRecommendation, getLocalRecommendationExplanation } from '../shared/localRecommendation';
import { validateAIRecommendation, validateAIRecommendationExplanation, validateAIRecommendationExplanationRequest, validateAIRecommendationRequest, validateOBSAudioConfig, validateOBSConfig, validateOBSConnectionSettings } from '../shared/validation';
import { loadBackup } from './backup-store';

dotenv.config();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800,
    minWidth: 700,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  obsManager.initialize();
  obsManager.onStatusChange((status) => {
    mainWindow?.webContents.send('obs:connection-changed', status);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('obs:connect', async (_, settings: unknown) => {
  const validation = validateOBSConnectionSettings(settings);
  if (!validation.success) {
    return { success: false, message: validation.message };
  }

  return obsManager.connect(validation.value);
});

ipcMain.handle('obs:disconnect', async () => {
  return obsManager.disconnect();
});

ipcMain.handle('obs:get-status', async () => {
  return obsManager.getStatus();
});

ipcMain.handle('obs:get-settings-snapshot', async () => {
  return obsManager.getSettingsSnapshot();
});

ipcMain.handle('obs:get-audio-snapshot', async () => {
  return obsManager.getAudioSnapshot();
});

ipcMain.handle('obs:configure', async (_, config: unknown) => {
  const validation = validateOBSConfig(config);
  if (!validation.success) {
    return { success: false, message: validation.message };
  }

  return obsManager.configure(validation.value);
});

ipcMain.handle('obs:configure-audio', async (_, config: unknown) => {
  const validation = validateOBSAudioConfig(config);
  if (!validation.success) {
    return { success: false, message: validation.message };
  }

  return obsManager.configureAudio(validation.value);
});

ipcMain.handle('obs:get-last-backup', async () => {
  const backup = await loadBackup();
  return backup
    ? { success: true, message: 'Respaldo disponible', backup }
    : { success: false, message: 'No hay respaldo guardado' };
});

ipcMain.handle('obs:restore-last-backup', async () => {
  const backup = await loadBackup();
  if (!backup) {
    return { success: false, message: 'No hay respaldo guardado', warnings: [] };
  }
  return obsManager.restoreSnapshot(backup.snapshot);
});

ipcMain.handle('system:get-info', async () => {
  const si = await import('systeminformation');
  const [cpu, gpu, mem, osInfo] = await Promise.all([
    si.cpu(),
    si.graphics(),
    si.mem(),
    si.osInfo(),
  ]);

  const gpuController = gpu.controllers[0];
  const hasNvenc = gpu.controllers.some(c => c.vendor === 'NVIDIA');

  return {
    cpu: {
      model: `${cpu.manufacturer} ${cpu.brand}`,
      cores: cpu.cores,
      speed: cpu.speed,
    },
    gpu: {
      model: gpuController?.model || 'Unknown',
      vram: gpuController?.vram || 0,
      vendor: gpuController?.vendor || 'Unknown',
      hasNvenc,
    },
    ram: {
      total: Math.round(mem.total / (1024 * 1024 * 1024)),
    },
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
    },
  };
});

ipcMain.handle('ai:get-recommendation', async (_, rawRequest: unknown) => {
  const validation = validateAIRecommendationRequest(rawRequest);
  if (!validation.success) {
    throw new Error(validation.message);
  }

  const request: AIRecommendationRequest = validation.value;
  const { systemInfo, mode, platform } = request;
  const prompt = `Eres un experto en configuración de OBS para streaming y grabación.
Analiza el hardware del usuario y recomienda la mejor configuración posible.

Preferencias del usuario:
- Modo: ${mode}
- Plataforma: ${platform}

Hardware disponible:
- CPU: ${systemInfo.cpu.model} (${systemInfo.cpu.cores} cores)
- GPU: ${systemInfo.gpu.model} ${systemInfo.gpu.vram}MB VRAM (Vendor: ${systemInfo.gpu.vendor})
- RAM: ${systemInfo.ram.total}GB
- OS: ${systemInfo.os.distro} ${systemInfo.os.release}
- Hardware NVENC disponible: ${systemInfo.gpu.hasNvenc ? 'Sí' : 'No'}

Responde en JSON con este formato exacto, sin texto adicional:
{
  "recommendations": {
    "resolution": "1920x1080",
    "fps": 60,
    "encoder": "nvenc",
    "bitrate": 6000,
    "audio_bitrate": 320,
    "recording_format": "mkv",
    "recording_quality": "high"
  },
  "reasoning": "Explicación de por qué esta configuración es óptima para este hardware"
}`;

  try {
    const response = await chatWithAI([
      { role: 'system', content: 'Eres un experto en configuración de OBS. Responde solo en JSON.' },
      { role: 'user', content: prompt }
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const recommendation = validateAIRecommendation(parsed);
      if (!recommendation.success) {
        throw new Error(recommendation.message);
      }
      return { ...recommendation.value, source: 'ai' as const };
    }
    throw new Error('Respuesta de IA no contenía JSON válido');
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    return getLocalRecommendation(request);
  }
});

ipcMain.handle('ai:explain-recommendation', async (_, rawRequest: unknown) => {
  const validation = validateAIRecommendationExplanationRequest(rawRequest);
  if (!validation.success) {
    throw new Error(validation.message);
  }

  const request: AIRecommendationExplanationRequest = validation.value;
  const { systemInfo, mode, platform, originalRecommendations, currentRecommendations, changedFields } = request;
  const prompt = `Eres un experto en configuracion de OBS para streaming y grabacion.
El usuario cambio manualmente una configuracion recomendada. Explica el probable resultado de estos cambios con lenguaje claro y util.

Contexto:
- Modo: ${mode}
- Plataforma: ${platform}
- CPU: ${systemInfo.cpu.model} (${systemInfo.cpu.cores} cores)
- GPU: ${systemInfo.gpu.model} ${systemInfo.gpu.vram}MB VRAM (Vendor: ${systemInfo.gpu.vendor})
- RAM: ${systemInfo.ram.total}GB
- Hardware NVENC disponible: ${systemInfo.gpu.hasNvenc ? 'Si' : 'No'}

Configuracion original:
- Resolucion: ${originalRecommendations.resolution}
- FPS: ${originalRecommendations.fps}
- Encoder: ${originalRecommendations.encoder}
- Bitrate de video: ${originalRecommendations.bitrate} kbps
- Bitrate de audio: ${originalRecommendations.audio_bitrate} kbps
- Formato de grabacion: ${originalRecommendations.recording_format}
- Calidad de grabacion: ${originalRecommendations.recording_quality}

Configuracion actual modificada:
- Resolucion: ${currentRecommendations.resolution}
- FPS: ${currentRecommendations.fps}
- Encoder: ${currentRecommendations.encoder}
- Bitrate de video: ${currentRecommendations.bitrate} kbps
- Bitrate de audio: ${currentRecommendations.audio_bitrate} kbps
- Formato de grabacion: ${currentRecommendations.recording_format}
- Calidad de grabacion: ${currentRecommendations.recording_quality}

Campos modificados: ${changedFields.join(', ')}

Responde en JSON con este formato exacto, sin texto adicional:
{
  "reasoning": "Explicacion breve en espanol: menciona calidad esperada, estabilidad probable, carga de CPU/GPU/red y cualquier riesgo concreto del cambio."
}`;

  try {
    const response = await chatWithAI([
      { role: 'system', content: 'Eres un experto en configuracion de OBS. Responde solo en JSON valido.' },
      { role: 'user', content: prompt },
    ]);

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const explanation = validateAIRecommendationExplanation({ ...parsed, source: 'ai' });
      if (!explanation.success) {
        throw new Error(explanation.message);
      }
      return explanation.value;
    }
    throw new Error('Respuesta de IA no contenia JSON valido');
  } catch (error) {
    console.error('Error explaining AI recommendation:', error);
    return getLocalRecommendationExplanation(request);
  }
});
