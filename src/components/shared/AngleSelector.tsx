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
          className={`rounded-lg p-3 text-center transition-all ${
            value === opt.value
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <div className="font-semibold text-sm">{opt.label}</div>
          <div className="text-xs mt-0.5 opacity-70">{opt.description}</div>
        </button>
      ))}
    </div>
  );
}
