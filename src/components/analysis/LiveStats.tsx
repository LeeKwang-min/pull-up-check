import type { FormIssue } from '../../types/analysis';

interface LiveStatsProps {
  repCount: number;
  currentSet: number;
  alerts: FormIssue[];
}

export function LiveStats({ repCount, currentSet, alerts }: LiveStatsProps) {
  const latestAlert = alerts.length > 0 ? alerts[alerts.length - 1] : null;

  return (
    <div className="flex items-center justify-between bg-zinc-900/80 backdrop-blur rounded-xl p-3">
      <div className="text-center">
        <div className="text-3xl font-bold tabular-nums">{repCount}</div>
        <div className="text-xs text-zinc-500">Reps</div>
      </div>
      <div className="text-center">
        <div className="text-xl font-semibold text-zinc-300">Set {currentSet}</div>
      </div>
      {latestAlert && (
        <div
          className={`text-xs px-2 py-1 rounded-lg max-w-[140px] truncate ${
            latestAlert.severity === 'high'
              ? 'bg-red-900/50 text-red-300'
              : 'bg-yellow-900/50 text-yellow-300'
          }`}
        >
          {latestAlert.detail}
        </div>
      )}
    </div>
  );
}
