import type { CameraAngle } from '../../types/analysis';

interface AngleSelectorProps {
  value: CameraAngle;
  onChange: (angle: CameraAngle) => void;
}

const options: { value: CameraAngle; label: string; description: string }[] = [
  { value: 'front', label: '정면', description: '좌/우 밸런스' },
  { value: 'back', label: '후면', description: '좌/우 밸런스' },
];

export function AngleSelector({ value, onChange }: AngleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`relative rounded-xl px-3 py-3.5 text-center cursor-pointer active:scale-[0.96] transition-all ${
              isActive
                ? 'bg-amber-500/10 ring-1.5 ring-amber-500/30'
                : 'bg-stone-800/60 hover:bg-stone-800 border border-stone-800'
            }`}
          >
            <div className={`font-semibold text-sm ${isActive ? 'text-amber-500' : 'text-stone-300'}`}>
              {opt.label}
            </div>
            <div className={`text-[11px] mt-0.5 ${isActive ? 'text-amber-500/60' : 'text-stone-600'}`}>
              {opt.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
