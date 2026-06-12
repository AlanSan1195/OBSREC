import React from 'react';
import { useAppStore } from '../store';
import { IconTwitch, IconYoutube, Section } from './ui';

const platforms = [
  {
    id: 'twitch',
    label: 'Twitch',
    icon: IconTwitch,
    selectedClasses: 'border-purple-500/60 bg-purple-500/10 text-purple-300 shadow-[0_0_30px_-10px_rgba(168,85,247,0.5)]',
    selectedIconClasses: 'border-purple-500/50 bg-purple-500/15 text-purple-300',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: IconYoutube,
    selectedClasses: 'border-red-500/60 bg-red-500/10 text-red-300 shadow-[0_0_30px_-10px_rgba(239,68,68,0.5)]',
    selectedIconClasses: 'border-red-500/50 bg-red-500/15 text-red-300',
  },
] as const;

export function PlatformSelector() {
  const { platform, setPlatform } = useAppStore();

  return (
    <Section title="2 · Selecciona plataforma">
      <div className="grid grid-cols-2 gap-3">
        {platforms.map((p) => {
          const selected = platform === p.id;
          const Icon = p.icon;
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => setPlatform(p.id)}
              aria-pressed={selected}
              className={`group flex flex-col items-center gap-3 rounded-xl border p-5 transition-all duration-200 ${
                selected
                  ? p.selectedClasses
                  : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-800/80 hover:text-zinc-200'
              }`}
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
                  selected
                    ? p.selectedIconClasses
                    : 'border-zinc-700/80 bg-zinc-800/80 text-zinc-400 group-hover:text-zinc-200'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">{p.label}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}
