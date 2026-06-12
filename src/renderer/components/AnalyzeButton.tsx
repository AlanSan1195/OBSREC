import React from 'react';
import { useAppStore } from '../store';
import { useElectronAPI } from '../hooks/useElectronAPI';
import { IconSparkles, Spinner } from './ui';

export function AnalyzeButton() {
  const { mode, platform, isAnalyzing, setIsAnalyzing, setError } = useAppStore();
  const { getSystemInfo, getAIRecommendation } = useElectronAPI();

  const isDisabled = !mode || !platform || isAnalyzing;

  const handleAnalyze = async () => {
    if (isDisabled || !mode || !platform) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const systemInfo = await getSystemInfo();
      await getAIRecommendation({ systemInfo, mode, platform });
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAnalyze}
      disabled={isDisabled}
      className={`flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-200 ${
        isDisabled
          ? 'cursor-not-allowed border border-zinc-800 bg-zinc-900/60 text-zinc-500'
          : 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-500/40 active:scale-[0.99]'
      }`}
    >
      {isAnalyzing ? (
        <Spinner className="h-5 w-5 border-white/80 border-t-transparent" />
      ) : (
        <IconSparkles className="h-5 w-5" />
      )}
      <span>
        {isAnalyzing
          ? 'Analizando tu sistema...'
          : !mode || !platform
            ? 'Selecciona modo y plataforma primero'
            : 'Buscar la mejor configuracion'}
      </span>
    </button>
  );
}
