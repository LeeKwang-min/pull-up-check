interface ScoreCardProps {
  label: string;
  score: number;
  color?: string;
}

export function ScoreCard({ label, score, color = '#3b82f6' }: ScoreCardProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 bg-zinc-900 rounded-xl p-4">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="white" fontSize="20" fontWeight="bold">
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs text-zinc-400">{label}</span>
    </div>
  );
}
