export interface AIServiceMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIService {
  name: string;
  chat(messages: AIServiceMessage[]): Promise<AsyncGenerator<string>>;
}

export type OBSMode = 'stream_record' | 'stream_only' | 'record_only';
export type OBSPlatform = 'twitch' | 'youtube';

export interface OBSConnectionSettings {
  host: string;
  port: number;
  password: string;
}

export interface OBSAudioFilterConfig {
  gainDb: number;
  compressorRatio: number;
  compressorThresholdDb: number;
  limiterThresholdDb: number;
  noiseSuppression: boolean;
}

export type OBSAudioMonitorType =
  | 'OBS_MONITORING_TYPE_NONE'
  | 'OBS_MONITORING_TYPE_MONITOR_ONLY'
  | 'OBS_MONITORING_TYPE_MONITOR_AND_OUTPUT';

export interface OBSAudioConfig {
  inputName: string;
  deviceId?: string;
  deviceName?: string;
  mono: boolean;
  filters: OBSAudioFilterConfig;
  monitorType?: OBSAudioMonitorType;
  syncOffsetMs?: number;
  ducking?: {
    enabled: boolean;
    desktopInputName: string;
  };
}

export interface OBSConfig {
  mode: OBSMode;
  platform: OBSPlatform;
  resolution: string;
  fps: number;
  encoder: string;
  bitrate: number;
  audioBitrate: number;
  recordingFormat: string;
  recordingQuality?: string;
  streamKey?: string;
  audio?: OBSAudioConfig;
}

export interface OBSAudioDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isRecommended: boolean;
  score: number;
  reason: string;
}

export interface OBSAudioFilterSnapshot {
  name: string;
  kind: string;
  enabled: boolean;
  settings: Record<string, unknown>;
}

export interface OBSAudioSettingsSnapshot {
  inputName: string;
  inputKind: string;
  inputUuid?: string;
  selectedDeviceId?: string;
  selectedDeviceName?: string;
  devices: OBSAudioDevice[];
  recommendedDevice?: OBSAudioDevice;
  muted: boolean;
  volumeDb: number;
  monitorType: string;
  syncOffsetMs: number;
  desktopAudio?: {
    inputName: string;
    duckingConfigured: boolean;
  };
  duckingTargets: {
    inputName: string;
    inputKind: string;
    duckingConfigured: boolean;
  }[];
  filters: OBSAudioFilterSnapshot[];
  obsrecFiltersConfigured: boolean;
  monoConfigured: boolean;
  monoSupported: boolean;
  warnings: string[];
}

export interface OBSSettingsSnapshot {
  streamServer: string;
  baseResolution: string;
  outputResolution: string;
  fps: number;
  encoder: string;
  bitrate: number;
  audioBitrate: number;
  recordingFormat: string;
  recordingQuality: string;
  audio?: OBSAudioSettingsSnapshot;
}

export interface OBSBackup {
  createdAt: string;
  appliedByObsrec: true;
  snapshot: OBSSettingsSnapshot;
}

export interface SystemInfo {
  cpu: {
    model: string;
    cores: number;
    speed: number;
  };
  gpu: {
    model: string;
    vram: number;
    vendor: string;
    hasNvenc: boolean;
  };
  ram: {
    total: number;
  };
  os: {
    platform: string;
    distro: string;
    release: string;
  };
}

export interface AIRecommendationRequest {
  systemInfo: SystemInfo;
  mode: OBSMode;
  platform: OBSPlatform;
}

export type AIRecommendationSettings = {
  resolution: string;
  fps: number;
  encoder: string;
  bitrate: number;
  audio_bitrate: number;
  recording_format: string;
  recording_quality: string;
};

export type AIRecommendationField = keyof AIRecommendationSettings;

export interface AIRecommendationExplanationRequest extends AIRecommendationRequest {
  originalRecommendations: AIRecommendationSettings;
  currentRecommendations: AIRecommendationSettings;
  changedFields: AIRecommendationField[];
}

export interface AIRecommendationExplanation {
  source: 'ai' | 'local';
  reasoning: string;
}

export interface AIRecommendation {
  source: 'ai' | 'local';
  recommendations: AIRecommendationSettings;
  originalRecommendations?: AIRecommendationSettings;
  originalReasoning?: string;
  reasoning: string;
}
