import type { AIRecommendation, AIRecommendationExplanation, AIRecommendationExplanationRequest, AIRecommendationField, AIRecommendationRequest, AIRecommendationSettings } from './types';

function getEncoder(request: AIRecommendationRequest): string {
  const vendor = request.systemInfo.gpu.vendor.toLowerCase();
  const model = request.systemInfo.gpu.model.toLowerCase();

  if (request.systemInfo.gpu.hasNvenc || vendor.includes('nvidia')) return 'nvenc';
  if (vendor.includes('apple') || model.includes('apple')) return 'apple vt h264';
  if (vendor.includes('intel')) return 'qsv';
  if (vendor.includes('amd')) return 'amd';

  return 'x264';
}

function getVideoProfile(request: AIRecommendationRequest) {
  const { cpu, ram } = request.systemInfo;
  const canUse1080p60 = cpu.cores >= 8 && ram.total >= 16;
  const wantsRecording = request.mode !== 'stream_only';

  if (canUse1080p60) {
    return {
      resolution: '1920x1080',
      fps: 60,
      bitrate: request.platform === 'youtube' && wantsRecording ? 9000 : 6000,
    };
  }

  return {
    resolution: '1280x720',
    fps: 30,
    bitrate: request.platform === 'youtube' ? 4500 : 3500,
  };
}

export function getLocalRecommendation(request: AIRecommendationRequest): AIRecommendation {
  const videoProfile = getVideoProfile(request);
  const encoder = getEncoder(request);
  const recordingQuality = request.mode === 'record_only' ? 'high' : 'stream';

  return {
    source: 'local',
    recommendations: {
      resolution: videoProfile.resolution,
      fps: videoProfile.fps,
      encoder,
      bitrate: videoProfile.bitrate,
      audio_bitrate: 320,
      recording_format: 'mkv',
      recording_quality: recordingQuality,
    },
    reasoning: 'Recomendacion local generada a partir de los nucleos de CPU, la RAM, el proveedor de GPU, la plataforma y el modo seleccionados (la IA no estuvo disponible).',
  };
}

const fieldLabels: Record<AIRecommendationField, string> = {
  resolution: 'resolucion',
  fps: 'FPS',
  encoder: 'encoder',
  bitrate: 'bitrate de video',
  audio_bitrate: 'bitrate de audio',
  recording_format: 'formato de grabacion',
  recording_quality: 'calidad de grabacion',
};

function readResolutionPixels(resolution: string): number {
  const [width, height] = resolution.split('x').map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 0;
  return width * height;
}

function getWorkload(settings: AIRecommendationSettings): number {
  return readResolutionPixels(settings.resolution) * settings.fps;
}

function getBitrateGuidance(settings: AIRecommendationSettings, platform: AIRecommendationRequest['platform']): string {
  const workload = getWorkload(settings);
  const bitrate = settings.bitrate;

  if (platform === 'twitch' && bitrate > 8000) {
    return 'En Twitch ese bitrate puede superar lo que muchos viewers reciben de forma estable; si no eres partner o tu audiencia tiene conexiones variadas, conviene vigilar cortes y buffering.';
  }

  if (workload >= 3840 * 2160 * 60 && bitrate < 35000) {
    return 'Para 4K a 60 FPS el bitrate elegido puede quedarse corto: la imagen probablemente tendra mas compresion en movimiento rapido.';
  }

  if (workload >= 2560 * 1440 * 60 && bitrate < 12000) {
    return 'Para 1440p a 60 FPS el bitrate es moderado; deberia verse bien en escenas tranquilas, pero puede perder detalle en juegos rapidos.';
  }

  if (workload >= 1920 * 1080 * 60 && bitrate < 6000) {
    return 'Para 1080p a 60 FPS el bitrate esta en el borde bajo; prioriza estabilidad, pero puede mostrar artefactos si hay mucho movimiento.';
  }

  if (bitrate > 20000 && settings.resolution === '1280x720') {
    return 'Ese bitrate es alto para 720p; no deberia mejorar mucho la nitidez y si aumentara consumo de red y archivo.';
  }

  return 'El bitrate queda en un rango razonable para la carga de video seleccionada.';
}

function getEncoderGuidance(settings: AIRecommendationSettings, request: AIRecommendationExplanationRequest): string {
  const encoder = settings.encoder.toLowerCase();
  const gpuVendor = request.systemInfo.gpu.vendor.toLowerCase();

  if (encoder.includes('x264')) {
    return `Usar x264 movera mas trabajo al CPU (${request.systemInfo.cpu.cores} nucleos); puede dar buena calidad, pero tambien puede subir el riesgo de frames perdidos si juegas o grabas algo pesado.`;
  }

  if (encoder.includes('nvenc') && !request.systemInfo.gpu.hasNvenc && !gpuVendor.includes('nvidia')) {
    return 'NVENC suele ser ideal en NVIDIA, pero este equipo no reporta NVENC; revisa disponibilidad real en OBS antes de aplicarlo.';
  }

  if (encoder.includes('apple')) {
    return 'Apple VT descarga el encode al hardware de video, lo que normalmente mantiene el sistema mas fresco y estable durante streaming o grabacion.';
  }

  if (encoder.includes('qsv')) {
    return 'QSV usa el encoder de Intel y puede ser una buena opcion de bajo consumo si OBS lo detecta correctamente.';
  }

  if (encoder.includes('amd')) {
    return 'El encoder de AMD reduce carga del CPU y suele favorecer estabilidad, aunque la calidad final depende bastante de la generacion de GPU.';
  }

  return 'El encoder seleccionado deberia definir principalmente si la carga cae sobre CPU o hardware dedicado.';
}

export function getLocalRecommendationExplanation(request: AIRecommendationExplanationRequest): AIRecommendationExplanation {
  const { currentRecommendations, originalRecommendations, changedFields } = request;
  const changedText = changedFields
    .map((field) => `${fieldLabels[field]}: ${String(originalRecommendations[field]).toUpperCase()} -> ${String(currentRecommendations[field]).toUpperCase()}`)
    .join(', ');
  const originalWorkload = getWorkload(originalRecommendations);
  const currentWorkload = getWorkload(currentRecommendations);
  const workloadRatio = originalWorkload > 0 ? currentWorkload / originalWorkload : 1;
  const workloadText = workloadRatio > 1.15
    ? `La carga de video sube aproximadamente ${Math.round((workloadRatio - 1) * 100)}%, asi que OBS necesitara mas GPU/CPU y red.`
    : workloadRatio < 0.85
      ? `La carga de video baja aproximadamente ${Math.round((1 - workloadRatio) * 100)}%, lo que deberia mejorar estabilidad y margen termico.`
      : 'La carga de video queda muy parecida a la recomendacion original.';

  return {
    source: 'local',
    reasoning: `${changedText}. ${workloadText} ${getBitrateGuidance(currentRecommendations, request.platform)} ${getEncoderGuidance(currentRecommendations, request)}`,
  };
}
