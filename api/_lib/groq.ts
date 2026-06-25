import Groq from 'groq-sdk';
import type { AIRecommendationExplanationRequest, AIRecommendationRequest, AIServiceMessage, MicProfileRequest } from '../../src/shared/types';

let groqInstance: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY || '';
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured on the backend.');
    }
    groqInstance = new Groq({ apiKey });
  }
  return groqInstance;
}

// maxTokens: usar null para NO enviar el parametro. Los sistemas agentic
// (groq/compound) rechazan la peticion con "request_too_large" si se reserva
// max_tokens, porque el modelo subyacente + la busqueda web exceden el limite
// por peticion. Para esos casos se omite.
type ChatOptions = { model?: string; temperature?: number; maxTokens?: number | null };

async function chat(messages: AIServiceMessage[], options: ChatOptions = {}): Promise<string> {
  const maxTokens = options.maxTokens === undefined ? 4000 : options.maxTokens;
  const completion = await getGroqClient().chat.completions.create({
    messages,
    model: options.model || process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    temperature: options.temperature ?? 0.7,
    ...(maxTokens === null ? {} : { max_tokens: maxTokens }),
  });

  return completion.choices[0]?.message?.content ?? '';
}

export function parseJsonObject(value: string): unknown {
  const match = value.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('AI response did not include JSON.');
  }

  return JSON.parse(match[0]);
}

export async function getRecommendationFromGroq(request: AIRecommendationRequest): Promise<unknown> {
  const { systemInfo, mode, platform, currentSettings } = request;
  const baselineSection = currentSettings
    ? `
Configuracion que OBS ya tiene (definida en el asistente inicial de OBS segun el hardware y la red del usuario; usala como base y solo cambiala si hay una mejora clara):
- Resolucion: ${currentSettings.resolution}
- FPS: ${currentSettings.fps}
- Encoder: ${currentSettings.encoder}
- Bitrate de video: ${currentSettings.bitrate} kbps
- Calidad de grabacion: ${currentSettings.recordingQuality}
- Servicio de streaming configurado: ${currentSettings.hasStreamService ? 'Si' : 'No'}
`
    : '';
  const prompt = `Eres un experto en configuracion de OBS para streaming y grabacion.
Analiza el hardware del usuario y recomienda la mejor configuracion posible.

Preferencias del usuario:
- Modo: ${mode}
- Plataforma: ${platform}

Hardware disponible:
- CPU: ${systemInfo.cpu.model} (${systemInfo.cpu.cores} cores)
- GPU: ${systemInfo.gpu.model} ${systemInfo.gpu.vram}MB VRAM (Vendor: ${systemInfo.gpu.vendor})
- RAM: ${systemInfo.ram.total}GB
- OS: ${systemInfo.os.distro} ${systemInfo.os.release}
- Hardware NVENC disponible: ${systemInfo.gpu.hasNvenc ? 'Si' : 'No'}
${baselineSection}
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
  "reasoning": "Explicacion de por que esta configuracion es optima para este hardware"
}`;

  const response = await chat([
    { role: 'system', content: 'Eres un experto en configuracion de OBS. Responde solo en JSON valido.' },
    { role: 'user', content: prompt },
  ]);

  return parseJsonObject(response);
}

export async function getMicProfileFromGroq(request: MicProfileRequest): Promise<unknown> {
  const { deviceName, inputKind, mode, os } = request;
  const prompt = `Eres un ingeniero de audio experto en OBS. Busca en la web las especificaciones OFICIALES del microfono cuyo nombre detectado por el sistema es: "${deviceName}".
Contexto: sistema operativo ${os ?? 'desconocido'}, tipo de entrada OBS "${inputKind ?? 'desconocido'}", uso "${mode}".

A partir de las caracteristicas reales del producto (tipo condensador/dinamico/electret, conexion USB/XLR/analogica, sensibilidad, nivel de ruido propio, si tiene DSP/cancelacion de ruido integrada) decide que filtros de OBS conviene aplicar, ajustar u OMITIR para una voz clara y profesional.

Reglas:
- Si el nombre es generico (ej. "Default", "Microphone", "Built-in") y no puedes identificar un modelo real, marca "identified": false y da valores conservadores.
- Si el microfono YA tiene DSP/cancelacion de ruido integrada, omite o suaviza la supresion de ruido de OBS.
- Un condensador sensible suele necesitar noise gate y menos ganancia; un dinamico de baja salida (ej. SM7B) necesita mas ganancia.
- "method": usa "rnnoise" salvo que recomiendes especificamente "speex" o "nvafx".
- En cada filtro incluye "enabled" (false = omitir) y un "reason" breve en espanol.
- Incluye "sources" con 1-3 URLs oficiales del fabricante que respalden las specs.

Responde SOLO con JSON valido y exactamente con esta forma:
{
  "profile": {
    "identified": true,
    "model": "Marca Modelo",
    "type": "condenser|dynamic|electret|unknown",
    "connection": "usb|xlr|analog|wireless|unknown",
    "hasBuiltinDsp": false,
    "summary": "resumen breve en espanol de las caracteristicas relevantes",
    "sources": ["https://..."]
  },
  "filters": {
    "noiseSuppression": { "enabled": true, "method": "rnnoise", "reason": "..." },
    "noiseGate": { "enabled": true, "closeThresholdDb": -45, "openThresholdDb": -35, "reason": "..." },
    "gain": { "enabled": true, "db": 6, "reason": "..." },
    "compressor": { "enabled": true, "ratio": 3, "thresholdDb": -18, "reason": "..." },
    "limiter": { "enabled": true, "thresholdDb": -1.5, "reason": "..." }
  },
  "reasoning": "explicacion general en espanol"
}`;

  const response = await chat(
    [
      { role: 'system', content: 'Eres un ingeniero de audio experto en OBS. Usas busqueda web para confirmar specs y respondes solo en JSON valido.' },
      { role: 'user', content: prompt },
    ],
    // Sin max_tokens: groq/compound lo rechaza ("request_too_large").
    { model: process.env.GROQ_SEARCH_MODEL || 'groq/compound', temperature: 0.3, maxTokens: null },
  );

  return parseJsonObject(response);
}

export async function getExplanationFromGroq(request: AIRecommendationExplanationRequest): Promise<unknown> {
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

  const response = await chat([
    { role: 'system', content: 'Eres un experto en configuracion de OBS. Responde solo en JSON valido.' },
    { role: 'user', content: prompt },
  ]);

  return parseJsonObject(response);
}
