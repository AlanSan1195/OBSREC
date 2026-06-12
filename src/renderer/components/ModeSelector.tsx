import React from 'react';
import { useAppStore } from '../store';
import { IconClapperboard, IconTv, IconVideo, Section } from './ui';

const modes = [
  { id: 'stream_record', label: 'Stream + Grabacion', icon: IconVideo },
  { id: 'stream_only', label: 'Solo Stream', icon: IconTv },
  { id: 'record_only', label: 'Solo Grabacion', icon: IconClapperboard },
] as const;

export function ModeSelector() {
  const { mode, setMode } = useAppStore();

  return (
    <Section title="1 · Selecciona modo">
      <div className="grid grid-cols-3 gap-3">
        {modes.map((m) => {
          const selected = mode === m.id;
          const Icon = m.icon;
          return (
            <button
              type="button"
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={selected}
              className={`group flex flex-col items-center gap-3 rounded-xl border p-5 transition-all duration-200 ${
                selected
                  ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300 shadow-[0_0_30px_-10px_rgba(99,102,241,0.5)]'
                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                  selected
                    ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
                    : 'border-zinc-700/80 bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-center text-sm font-semibold leading-tight">{m.label}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
