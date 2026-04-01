interface ScoreCardProps {
  label: string;
  score: number;
  color?: string;
}

export function ScoreCard({ label, score, color = '#F59E0B' }: ScoreCardProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2 bg-stone-800 rounded-2xl p-5 border border-amber-500/10">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#44403C" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
        <text x="50" y="46" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="22" fontWeight="bold" fontFamily="Barlow Condensed">
          {Math.round(score)}
        </text>
        <text x="50" y="62" textAnchor="middle" fill="#A8A29E" fontSize="9">
          / 100
        </text>
      </svg>
      <span className="text-xs text-stone-400 uppercase tracking-wider font-[Barlow_Condensed]">{label}</span>
    </div>
  );
}
