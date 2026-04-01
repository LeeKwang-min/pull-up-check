import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { AngleSelector } from '../../components/shared/AngleSelector';
import { useSessionStore } from '../../stores/session-store';
import type { CameraAngle } from '../../types/analysis';

export const Route = createFileRoute('/analyze/')({
  component: AnalyzePage,
});

function AnalyzePage() {
  const { defaultAngle } = useSessionStore();
  const [angle, setAngle] = useState<CameraAngle>(defaultAngle);

  return (
    <div className="py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold">New Analysis</h2>
        <p className="text-zinc-400 text-sm mt-1">Choose your filming angle and input method</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">Filming Angle</label>
        <AngleSelector value={angle} onChange={setAngle} />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">Input Method</label>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/analyze/camera"
            search={{ angle }}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-2xl mb-1">📷</div>
            <div className="font-semibold text-sm">Real-time Camera</div>
            <div className="text-xs text-zinc-500 mt-0.5">Measure live</div>
          </Link>
          <Link
            to="/analyze/upload"
            search={{ angle }}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-2xl mb-1">📁</div>
            <div className="font-semibold text-sm">Upload Video</div>
            <div className="text-xs text-zinc-500 mt-0.5">Analyze recorded</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
