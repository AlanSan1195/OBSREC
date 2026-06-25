import { describe, expect, it } from 'vitest';
import { getLocalMicProfile } from './localMicProfile';
import type { MicProfileRequest } from './types';

function makeRequest(overrides: Partial<MicProfileRequest> = {}): MicProfileRequest {
  return { deviceName: 'Microphone', mode: 'record_only', ...overrides };
}

describe('getLocalMicProfile', () => {
  it('identifica un condensador y activa la compuerta con ganancia moderada', () => {
    const result = getLocalMicProfile(makeRequest({ deviceName: 'Blue Yeti' }));
    expect(result.source).toBe('local');
    expect(result.profile.identified).toBe(true);
    expect(result.profile.type).toBe('condenser');
    expect(result.profile.connection).toBe('usb');
    expect(result.filters.noiseGate.enabled).toBe(true);
    expect(result.filters.gain.db).toBeLessThan(10);
  });

  it('identifica un dinamico y sube la ganancia sin compuerta por defecto', () => {
    const result = getLocalMicProfile(makeRequest({ deviceName: 'Shure SM7B' }));
    expect(result.profile.type).toBe('dynamic');
    expect(result.profile.connection).toBe('xlr');
    expect(result.filters.gain.db).toBeGreaterThan(10);
    expect(result.filters.noiseGate.enabled).toBe(false);
  });

  it('omite la supresion de ruido cuando detecta DSP integrado', () => {
    const result = getLocalMicProfile(makeRequest({ deviceName: 'NVIDIA Broadcast' }));
    expect(result.profile.hasBuiltinDsp).toBe(true);
    expect(result.filters.noiseSuppression.enabled).toBe(false);
  });

  it('da valores conservadores cuando el nombre es generico', () => {
    const result = getLocalMicProfile(makeRequest({ deviceName: 'Default' }));
    expect(result.profile.identified).toBe(false);
    expect(result.profile.type).toBe('unknown');
    expect(result.filters.gain.enabled).toBe(true);
    expect(result.filters.compressor.enabled).toBe(true);
  });

  it('endurece el compresor en modo de streaming', () => {
    const stream = getLocalMicProfile(makeRequest({ deviceName: 'Default', mode: 'stream_record' }));
    const record = getLocalMicProfile(makeRequest({ deviceName: 'Default', mode: 'record_only' }));
    expect(stream.filters.compressor.ratio).toBeGreaterThan(record.filters.compressor.ratio);
  });
});
