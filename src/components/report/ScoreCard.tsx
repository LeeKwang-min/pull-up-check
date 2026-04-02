interface ScoreCardProps {
  label: string;
  score: number;
  color?: string;
}

export function ScoreCard({ label, score, color = '#D97706' }: ScoreCardProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2.5 surface-card rounded-2xl py-5 px-4">
      <svg width="96" height="96" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#E7E5E4" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="transition-all duration-700 ease-out"
        />
        <text x="50" y="46" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="24" fontWeight="bold" fontFamily="Barlow Condensed">
          {Math.round(score)}
        </text>
        <text x="50" y="63" textAnchor="middle" fill="#A8A29E" fontSize="9">
          / 100
        </text>
      </svg>
      <span className="section-label">{label}</span>
    </div>
  );
}
