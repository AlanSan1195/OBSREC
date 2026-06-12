import { contextBridge, ipcRenderer } from 'electron';
import type { AIRecommendationExplanationRequest, AIRecommendationRequest, OBSAudioConfig, OBSConfig, OBSConnectionSettings } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  obs: {
    connect: (settings: OBSConnectionSettings) => ipcRenderer.invoke('obs:connect', settings),
    disconnect: () => ipcRenderer.invoke('obs:disconnect'),
    getStatus: () => ipcRenderer.invoke('obs:get-status'),
    getSettingsSnapshot: () => ipcRenderer.invoke('obs:get-settings-snapshot'),
    getAudioSnapshot: () => ipcRenderer.invoke('obs:get-audio-snapshot'),
    getLastBackup: () => ipcRenderer.invoke('obs:get-last-backup'),
    restoreLastBackup: () => ipcRenderer.invoke('obs:restore-last-backup'),
    configure: (config: OBSConfig) => ipcRenderer.invoke('obs:configure', config),
    configureAudio: (config: OBSAudioConfig) => ipcRenderer.invoke('obs:configure-audio', config),
    onConnectionChanged: (callback: (status: { connected: boolean; message: string }) => void) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        status: { connected: boolean; message: string },
      ) => callback(status);
      ipcRenderer.on('obs:connection-changed', listener);
      return () => ipcRenderer.removeListener('obs:connection-changed', listener);
    },
  },
  system: {
    getInfo: () => ipcRenderer.invoke('system:get-info'),
  },
  ai: {
    getRecommendation: (request: AIRecommendationRequest) => ipcRenderer.invoke('ai:get-recommendation', request),
    explainRecommendation: (request: AIRecommendationExplanationRequest) => ipcRenderer.invoke('ai:explain-recommendation', request),
  },
});
