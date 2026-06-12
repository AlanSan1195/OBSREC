import { useAppStore } from '../store';
import type { AIRecommendation, AIRecommendationExplanation, AIRecommendationExplanationRequest, AIRecommendationRequest, OBSBackup, OBSAudioConfig, OBSAudioSettingsSnapshot, OBSConfig, OBSConnectionSettings, OBSSettingsSnapshot, SystemInfo } from '../../shared/types';

function getElectronAPI() {
  if (!window.electronAPI) {
    throw new Error('OBSREC debe abrirse en la app de escritorio de Electron para controlar OBS. La vista del navegador solo muestra la interfaz, pero no puede conectarse a OBS WebSocket.');
  }

  return window.electronAPI;
}

export function useElectronAPI() {
  const setSystemInfo = useAppStore((state) => state.setSystemInfo);
  const setRecommendation = useAppStore((state) => state.setRecommendation);
  const setObsConnected = useAppStore((state) => state.setObsConnected);
  const setObsSettingsSnapshot = useAppStore((state) => state.setObsSettingsSnapshot);
  const setObsAudioSnapshot = useAppStore((state) => state.setObsAudioSnapshot);
  const setObsMessage = useAppStore((state) => state.setObsMessage);
  const setError = useAppStore((state) => state.setError);
  const setIsApplying = useAppStore((state) => state.setIsApplying);

  const getSystemInfo = async () => {
    try {
      const info = await getElectronAPI().system.getInfo();
      setSystemInfo(info);
      return info;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo leer la informacion del sistema');
      throw error;
    }
  };

  const getAIRecommendation = async (request: AIRecommendationRequest) => {
    try {
      const recommendation = await getElectronAPI().ai.getRecommendation(request);
      setRecommendation(recommendation);
      return recommendation;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo obtener la recomendacion de IA');
      throw error;
    }
  };

  const explainAIRecommendation = async (request: AIRecommendationExplanationRequest) => {
    try {
      return await getElectronAPI().ai.explainRecommendation(request);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo actualizar la explicacion de IA');
      throw error;
    }
  };

  const connectToOBS = async (settings: OBSConnectionSettings) => {
    try {
      const result = await getElectronAPI().obs.connect(settings);
      setObsConnected(result.success);
      setObsMessage(result.message);
      if (result.success) {
        const snapshotResult = await getElectronAPI().obs.getSettingsSnapshot();
        if (snapshotResult.success && snapshotResult.snapshot) {
          setObsSettingsSnapshot(snapshotResult.snapshot);
          setObsAudioSnapshot(snapshotResult.snapshot.audio ?? null);
        } else {
          setObsSettingsSnapshot(null);
          setObsAudioSnapshot(null);
          setObsMessage(snapshotResult.message);
        }
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo conectar con OBS';
      setObsConnected(false);
      setObsMessage(message);
      setError(message);
      throw error;
    }
  };

  const disconnectFromOBS = async () => {
    const result = await getElectronAPI().obs.disconnect();
    setObsConnected(false);
    setObsSettingsSnapshot(null);
    setObsAudioSnapshot(null);
    setObsMessage(result.message);
    return result;
  };

  const refreshAudioSnapshot = async () => {
    const result = await getElectronAPI().obs.getAudioSnapshot();
    if (result.success && result.snapshot) {
      setObsAudioSnapshot(result.snapshot);
    }
    return result;
  };

  const applyAudioConfig = async (config: OBSAudioConfig) => {
    setIsApplying(true);
    try {
      const result = await getElectronAPI().obs.configureAudio(config);
      if (result.success && result.snapshot) {
        setObsAudioSnapshot(result.snapshot);
      }
      return result;
    } finally {
      setIsApplying(false);
    }
  };

  const applyConfig = async (config: OBSConfig) => {
    setIsApplying(true);
    try {
      const result = await getElectronAPI().obs.configure(config);
      if (result.success) {
        const snapshotResult = await getElectronAPI().obs.getSettingsSnapshot();
        if (snapshotResult.success && snapshotResult.snapshot) {
          setObsSettingsSnapshot(snapshotResult.snapshot);
          setObsAudioSnapshot(snapshotResult.snapshot.audio ?? null);
        }
      }
      return result;
    } finally {
      setIsApplying(false);
    }
  };

  const getLastBackup = async () => {
    return getElectronAPI().obs.getLastBackup();
  };

  const restoreLastBackup = async () => {
    const result = await getElectronAPI().obs.restoreLastBackup();
    if (result.success) {
      const snapshotResult = await getElectronAPI().obs.getSettingsSnapshot();
      if (snapshotResult.success && snapshotResult.snapshot) {
        setObsSettingsSnapshot(snapshotResult.snapshot);
        setObsAudioSnapshot(snapshotResult.snapshot.audio ?? null);
      }
      setObsMessage(result.message);
    } else {
      setError(result.message);
    }
    return result;
  };

  return {
    getSystemInfo,
    getAIRecommendation,
    explainAIRecommendation,
    connectToOBS,
    disconnectFromOBS,
    refreshAudioSnapshot,
    applyAudioConfig,
    applyConfig,
    getLastBackup,
    restoreLastBackup,
  };
}

declare global {
  interface Window {
    electronAPI: {
      obs: {
        connect: (settings: OBSConnectionSettings) => Promise<{ success: boolean; message: string }>;
        disconnect: () => Promise<{ success: boolean; message: string }>;
        getStatus: () => Promise<{ connected: boolean; message: string }>;
        getSettingsSnapshot: () => Promise<{ success: boolean; message: string; snapshot?: OBSSettingsSnapshot }>;
        getAudioSnapshot: () => Promise<{ success: boolean; message: string; snapshot?: OBSAudioSettingsSnapshot }>;
        getLastBackup: () => Promise<{ success: boolean; message: string; backup?: OBSBackup }>;
        restoreLastBackup: () => Promise<{ success: boolean; message: string; warnings: string[] }>;
        configure: (config: OBSConfig) => Promise<{ success: boolean; message: string }>;
        configureAudio: (config: OBSAudioConfig) => Promise<{ success: boolean; message: string; snapshot?: OBSAudioSettingsSnapshot; warnings: string[] }>;
        onConnectionChanged: (callback: (status: { connected: boolean; message: string }) => void) => () => void;
      };
      system: {
        getInfo: () => Promise<SystemInfo>;
      };
      ai: {
        getRecommendation: (request: AIRecommendationRequest) => Promise<AIRecommendation>;
        explainRecommendation: (request: AIRecommendationExplanationRequest) => Promise<AIRecommendationExplanation>;
      };
    };
  }
}
