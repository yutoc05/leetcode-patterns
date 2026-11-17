export interface ProgressStats {
  totals: { Easy: number; Medium: number; Hard: number };
  done: { Easy: number; Medium: number; Hard: number };
  total: number;
  totalDone: number;
}

export default function ProgressBar({ stats, pct }: { stats: ProgressStats; pct: number }) {
  return (
    <div className="pt-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="text-lg font-medium text-ink tabular-nums">{stats.totalDone}/{stats.total} completed ({pct}%)</span>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium tabular-nums">
          {stats.totals.Easy > 0 && (
            <span className="text-easy">
              Easy: {stats.done.Easy}/{stats.totals.Easy}
            </span>
          )}
          {stats.totals.Medium > 0 && (
            <span className="text-medium">
              Medium: {stats.done.Medium}/{stats.totals.Medium}
            </span>
          )}
          {stats.totals.Hard > 0 && (
            <span className="text-hard">
              Hard: {stats.done.Hard}/{stats.totals.Hard}
            </span>
          )}
        </div>
      </div>
      <div className="relative h-1 overflow-hidden bg-sheet-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Completion progress">
        <div
          className="absolute inset-0 origin-left bg-accent transition-transform duration-(--dur-long) ease-out"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}
