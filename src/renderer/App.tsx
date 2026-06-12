import React, { useEffect } from 'react';
import { useAppStore } from './store';
import { ModeSelector } from './components/ModeSelector';
import { PlatformSelector } from './components/PlatformSelector';
import { AnalyzeButton } from './components/AnalyzeButton';
import { PCAnalysis } from './components/PCAnalysis';
import { Recommendations } from './components/Recommendations';
import { OBSComparison } from './components/OBSComparison';
import { AudioConfiguration } from './components/AudioConfiguration';
import { ImportButton } from './components/ImportButton';
import { StatusBar } from './components/StatusBar';
import { IconAlert, IconVideo, IconX } from './components/ui';

export default function App() {
  const {
    error,
    setError,
    obsConnected,
    setObsAudioSnapshot,
    setObsConnected,
    setObsMessage,
    setObsSettingsSnapshot,
  } = useAppStore();

  useEffect(() => {
    if (!window.electronAPI) return undefined;

    return window.electronAPI.obs.onConnectionChanged((status) => {
      setObsConnected(status.connected);
      setObsMessage(status.message);

      if (!status.connected) {
        setObsSettingsSnapshot(null);
        setObsAudioSnapshot(null);
      }
    });
  }, [setObsAudioSnapshot, setObsConnected, setObsMessage, setObsSettingsSnapshot]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <IconVideo className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              OBS<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">REC</span>
            </h1>
            <p className="text-sm text-zinc-400">
              Configura OBS automaticamente para streaming y grabacion
            </p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            obsConnected
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-zinc-700/80 bg-zinc-900/80 text-zinc-400'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {obsConnected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                obsConnected ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
          </span>
          {obsConnected ? 'OBS conectado' : 'OBS sin conexion'}
        </span>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <IconAlert className="h-5 w-5 shrink-0 text-red-400" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Cerrar mensaje de error"
            className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      )}

      <main className="flex-1 space-y-5">
        <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
          <ModeSelector />
          <PlatformSelector />
        </div>
        <AnalyzeButton />
        <PCAnalysis />
        <Recommendations />
        <OBSComparison />
        <AudioConfiguration />
        <ImportButton />
      </main>

      <StatusBar />
    </div>
  );
}
