import type { FormIssue } from '../../types/analysis';

interface LiveStatsProps {
  repCount: number;
  currentSet: number;
  alerts: FormIssue[];
}

export function LiveStats({ repCount, currentSet, alerts }: LiveStatsProps) {
  const latestAlert = alerts.length > 0 ? alerts[alerts.length - 1] : null;

  return (
    <div className="surface-card glow-amber rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tabular-nums text-amber-500 font-[Barlow_Condensed] leading-none">{repCount}</span>
          <span className="text-xs text-stone-500">회</span>
        </div>
        <div className="text-sm font-semibold text-stone-400 uppercase tracking-wider font-[Barlow_Condensed]">
          세트 {currentSet}
        </div>
      </div>
      {latestAlert && (
        <div
          className={`mt-3 text-xs px-3 py-2 rounded-lg truncate ${
            latestAlert.severity === 'high'
              ? 'bg-red-500/10 text-red-400 border border-red-500/15'
              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/15'
          }`}
        >
          {latestAlert.detail}
        </div>
      )}
    </div>
  );
}
