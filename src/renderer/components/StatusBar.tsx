import React from 'react';
import { useAppStore } from '../store';

export function StatusBar() {
  const { obsConnected, obsMessage } = useAppStore();

  return (
    <div className="mt-auto pt-6">
      <div
        aria-live="polite"
        className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3 backdrop-blur-sm"
      >
        <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
          {obsConnected && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              obsConnected ? 'bg-emerald-400' : 'bg-red-500'
            }`}
          />
        </span>
        <span className="text-sm text-zinc-400">{obsMessage}</span>
      </div>
    </div>
  );
}
