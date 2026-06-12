import React from 'react';
import { useAppStore } from '../store';
import {
  IconAlert,
  IconCheck,
  IconCpu,
  IconHardDrive,
  IconMemory,
  IconMonitor,
  Section,
  Spinner,
} from './ui';

function SpecCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/70 p-4">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400">
        {icon}
      </span>
      <div className="min-w-0">
        <span className="block text-xs uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="mt-0.5 block truncate text-sm font-medium text-zinc-100" title={value}>
          {value}
        </span>
        {detail && <span className="text-xs text-zinc-500">{detail}</span>}
      </div>
    </div>
  );
}

export function PCAnalysis() {
  const { systemInfo, isAnalyzing } = useAppStore();

  if (isAnalyzing) {
    return (
      <Section title="Analisis del PC" icon={<IconCpu className="h-4 w-4" />}>
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-zinc-400">Analizando tu sistema...</span>
        </div>
      </Section>
    );
  }

  if (!systemInfo) return null;

  return (
    <Section title="Analisis del PC" icon={<IconCpu className="h-4 w-4" />}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SpecCard
          icon={<IconCpu className="h-4 w-4" />}
          label="CPU"
          value={systemInfo.cpu.model}
          detail={`${systemInfo.cpu.cores} nucleos`}
        />
        <SpecCard
          icon={<IconMonitor className="h-4 w-4" />}
          label="GPU"
          value={systemInfo.gpu.model}
          detail={`${(systemInfo.gpu.vram / 1024).toFixed(1)}GB VRAM`}
        />
        <SpecCard
          icon={<IconMemory className="h-4 w-4" />}
          label="RAM"
          value={`${systemInfo.ram.total}GB DDR`}
        />
        <SpecCard
          icon={<IconHardDrive className="h-4 w-4" />}
          label="OS"
          value={systemInfo.os.distro}
          detail={systemInfo.os.release}
        />
      </div>
      <div
        className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          systemInfo.gpu.hasNvenc
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        }`}
      >
        {systemInfo.gpu.hasNvenc ? (
          <>
            <IconCheck className="h-4 w-4 shrink-0" />
            <span>Hardware NVENC disponible</span>
          </>
        ) : (
          <>
            <IconAlert className="h-4 w-4 shrink-0" />
            <span>Sin NVENC por hardware; se usara codificacion por software</span>
          </>
        )}
      </div>
    </Section>
  );
}
