import type { CameraAngle } from '../../types/analysis';

interface AngleSelectorProps {
  value: CameraAngle;
  onChange: (angle: CameraAngle) => void;
}

const options: { value: CameraAngle; label: string; description: string }[] = [
  { value: 'front', label: '정면', description: '좌/우 밸런스' },
  { value: 'back', label: '후면', description: '좌/우 밸런스' },
  { value: 'side', label: '측면', description: '가동범위 & 키핑' },
];

export function AngleSelector({ value, onChange }: AngleSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-xl p-3 text-center transition-all cursor-pointer ${
            value === opt.value
              ? 'bg-amber-500/15 text-amber-500 ring-2 ring-amber-500/30 border border-amber-500/20'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-700'
          }`}
        >
          <div className="font-semibold text-sm">{opt.label}</div>
          <div className="text-xs mt-0.5 opacity-70">{opt.description}</div>
        </button>
      ))}
    </div>
  );
}
