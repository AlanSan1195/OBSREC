import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { createDefaultAudioConfig } from './AudioConfiguration';
import { buildComparisonRows, isSameValue } from './OBSComparison';
import { ConfirmDialog } from './ConfirmDialog';
import { IconPlug, IconUpload, Section, Spinner } from './ui';

const inputClasses =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition-colors focus:border-indigo-500/60';

export function ImportButton() {
  const [showPassword, setShowPassword] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const {
    mode,
    platform,
    recommendation,
    obsConnectionSettings,
    obsAudioSnapshot,
    obsSettingsSnapshot,
    obsConnected,
    setObsConnectionSettings,
    setObsMessage,
    setError,
    isApplying,
  } = useAppStore();
  const { connectToOBS, applyConfig } = useElectronAPI();

  const canImport = mode && platform && recommendation && obsConnected;
  const changedRows = recommendation && obsSettingsSnapshot
    ? buildComparisonRows(obsSettingsSnapshot, recommendation.recommendations).filter((row) => !isSameValue(row))
    : [];

  const handleImport = async () => {
    if (!canImport || !recommendation) return;

    try {
      const result = await applyConfig({
        mode,
        platform,
        resolution: recommendation.recommendations.resolution,
        fps: recommendation.recommendations.fps,
        encoder: recommendation.recommendations.encoder,
        bitrate: recommendation.recommendations.bitrate,
        audioBitrate: recommendation.recommendations.audio_bitrate,
        recordingFormat: recommendation.recommendations.recording_format,
        recordingQuality: recommendation.recommendations.recording_quality,
        audio: obsAudioSnapshot
          ? createDefaultAudioConfig(
            obsAudioSnapshot.inputName,
            obsAudioSnapshot.recommendedDevice ?? obsAudioSnapshot.devices.find((device) => device.id === obsAudioSnapshot.selectedDeviceId),
          )
          : undefined,
      });

      if (result.success) {
        setObsMessage('Configuracion aplicada correctamente');
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo aplicar la configuracion');
    }
  };

  const handleImportClick = () => {
    if (!canImport || !recommendation) return;
    setConfirmOpen(true);
  };

  const handleConnect = async () => {
    setError(null);
    try {
      const result = await connectToOBS(obsConnectionSettings);
      if (!result.success) {
        setError(result.message);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo conectar con OBS');
    }
  };

  return (
    <div>
      {!obsConnected ? (
        <Section
          title="Conexion con OBS"
          icon={<IconPlug className="h-4 w-4" />}
          subtitle="Activa el servidor WebSocket en OBS: Herramientas > Ajustes del servidor WebSocket."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_1.5fr]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Host de OBS
                </span>
                <input
                  value={obsConnectionSettings.host}
                  onChange={(event) => setObsConnectionSettings({ host: event.target.value })}
                  className={inputClasses}
                  spellCheck={false}
                />
                <span className="mt-2 block text-xs text-zinc-600">Normalmente localhost.</span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Puerto de OBS
                </span>
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={obsConnectionSettings.port}
                  onChange={(event) => setObsConnectionSettings({ port: Number(event.target.value) })}
                  className={inputClasses}
                />
                <span className="mt-2 block text-xs text-zinc-600">Normalmente 4455, no 5173.</span>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Password de WebSocket
                </span>
                <div className="flex rounded-xl border border-zinc-800 bg-zinc-950/70 transition-colors focus-within:border-indigo-500/60">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={obsConnectionSettings.password}
                    onChange={(event) => setObsConnectionSettings({ password: event.target.value })}
                    className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="shrink-0 rounded-r-xl border-l border-zinc-800 px-4 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <span className="mt-2 block text-xs text-zinc-600">Dejalo vacio solo si la autenticacion de OBS esta desactivada.</span>
              </label>
            </div>
            <button
              type="button"
              onClick={handleConnect}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800/80 px-6 py-3.5 text-base font-semibold text-zinc-200 transition-all duration-200 hover:border-zinc-600 hover:bg-zinc-700/80 active:scale-[0.99]"
            >
              <IconPlug className="h-5 w-5" />
              <span>Conectar con OBS</span>
            </button>
          </div>
        </Section>
      ) : (
        <button
          type="button"
          onClick={handleImportClick}
          disabled={!canImport || isApplying}
          className={`flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200 ${
            canImport && !isApplying
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-500/40 active:scale-[0.99]'
              : 'cursor-not-allowed border border-zinc-800 bg-zinc-900/60 text-zinc-500'
          }`}
        >
          {isApplying ? (
            <>
              <Spinner className="h-5 w-5 border-white/80 border-t-transparent" />
              <span>Aplicando...</span>
            </>
          ) : (
            <>
              <IconUpload className="h-5 w-5" />
              <span>Importar a OBS</span>
            </>
          )}
        </button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar cambios en OBS"
        confirmLabel="Aplicar cambios"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void handleImport();
        }}
      >
        {changedRows.length > 0 ? (
          <div className="space-y-2">
            {changedRows.map((row) => (
              <div key={row.label} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">{row.label}</span>
                <span className="mt-1 block text-zinc-300">
                  {row.current || 'Desconocido'} → <span className="font-medium text-indigo-300">{row.recommended}</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>No se detectaron diferencias, pero OBSREC volvera a aplicar la configuracion recomendada.</p>
        )}
        <p>Se guardara un respaldo automatico de tu configuracion actual.</p>
      </ConfirmDialog>
    </div>
  );
}
