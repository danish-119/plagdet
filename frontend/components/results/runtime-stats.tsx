import { Clock, FileCode, GitCompare, AlertTriangle, BarChart3, Zap } from 'lucide-react';

interface RuntimeStatsProps {
  stats: {
    totalElapsedTime: number;
    filesProcessed: number;
    language: string;
    candidatePairs: number;
    highConfidenceMatches: number;
    averageSimilarity: number;
    speedupAchieved: number;
    displayedPairs?: number;
    totalPairsFound?: number;
  };
}

type Tone = 'accent' | 'danger' | 'success';

const toneClass: Record<Tone, string> = {
  accent: 'text-[var(--color-accent-primary)] bg-[color-mix(in_srgb,var(--color-accent-primary)_14%,transparent)]',
  danger: 'text-[var(--color-danger)] bg-[color-mix(in_srgb,var(--color-danger)_14%,transparent)]',
  success: 'text-[var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]',
};

export function RuntimeStats({ stats }: RuntimeStatsProps) {
  const items: { icon: React.ElementType; label: string; value: string; tone: Tone }[] = [
    {
      icon: AlertTriangle,
      label: 'High-confidence matches',
      value: `${stats.highConfidenceMatches}`,
      tone: 'danger',
    },
    { icon: FileCode, label: 'Files processed', value: `${stats.filesProcessed}`, tone: 'accent' },
    { icon: GitCompare, label: 'Candidate pairs', value: stats.candidatePairs.toLocaleString(), tone: 'accent' },
    { icon: BarChart3, label: 'Average similarity', value: `${stats.averageSimilarity.toFixed(1)}%`, tone: 'accent' },
    { icon: Clock, label: 'Elapsed time', value: `${stats.totalElapsedTime.toFixed(1)}s`, tone: 'accent' },
    { icon: Zap, label: 'Speedup', value: `${stats.speedupAchieved.toFixed(1)}×`, tone: 'success' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className="surface p-5 flex items-center gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)] leading-tight">
              {value}
            </p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
