import type { CameraAngle } from '../../types/analysis';

interface AngleSelectorProps {
  value: CameraAngle;
  onChange: (angle: CameraAngle) => void;
}

const options: { value: CameraAngle; label: string; description: string }[] = [
  { value: 'front', label: '정면', description: '좌우 밸런스 분석' },
  { value: 'back', label: '후면', description: '등 근육·견갑골 분석' },
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
                ? 'bg-amber-50 ring-1.5 ring-amber-400'
                : 'bg-white border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className={`font-semibold text-sm ${isActive ? 'text-amber-600' : 'text-stone-600'}`}>
              {opt.label}
            </div>
            <div className={`text-[11px] mt-0.5 ${isActive ? 'text-amber-500/70' : 'text-stone-400'}`}>
              {opt.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
