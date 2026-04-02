interface ProgressBarProps {
  percent: number;
  label?: string;
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  return (
    <div className="space-y-2.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">{label}</span>
          <span className="text-xs font-medium text-stone-600 tabular-nums font-[Barlow_Condensed]">
            {Math.round(percent)}%
          </span>
        </div>
      )}
      <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
