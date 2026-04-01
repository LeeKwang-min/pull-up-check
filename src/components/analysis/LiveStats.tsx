import type { FormIssue } from '../../types/analysis';

interface LiveStatsProps {
  repCount: number;
  currentSet: number;
  alerts: FormIssue[];
}

export function LiveStats({ repCount, currentSet, alerts }: LiveStatsProps) {
  const latestAlert = alerts.length > 0 ? alerts[alerts.length - 1] : null;

  return (
    <div className="flex items-center justify-between bg-stone-800 border border-amber-500/10 rounded-2xl p-4">
      <div className="text-center">
        <div className="text-4xl font-bold tabular-nums text-amber-500 font-[Barlow_Condensed]">{repCount}</div>
        <div className="text-xs text-stone-400">회</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-stone-300 uppercase tracking-wider font-[Barlow_Condensed]">세트 {currentSet}</div>
      </div>
      {latestAlert && (
        <div
          className={`text-xs px-3 py-1.5 rounded-lg max-w-[140px] truncate ${
            latestAlert.severity === 'high'
              ? 'bg-red-900/30 text-red-400 border border-red-500/20'
              : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20'
          }`}
        >
          {latestAlert.detail}
        </div>
      )}
    </div>
  );
}
