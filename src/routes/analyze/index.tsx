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
        <h2 className="text-2xl font-bold">새 분석</h2>
        <p className="text-zinc-400 text-sm mt-1">촬영 각도와 입력 방식을 선택하세요</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">촬영 각도</label>
        <AngleSelector value={angle} onChange={setAngle} />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">입력 방식</label>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/analyze/camera"
            search={{ angle }}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-2xl mb-1">📷</div>
            <div className="font-semibold text-sm">실시간 카메라</div>
            <div className="text-xs text-zinc-500 mt-0.5">실시간 측정</div>
          </Link>
          <Link
            to="/analyze/upload"
            search={{ angle }}
            className="bg-zinc-800 hover:bg-zinc-700 rounded-xl p-4 text-center transition-colors"
          >
            <div className="text-2xl mb-1">📁</div>
            <div className="font-semibold text-sm">영상 업로드</div>
            <div className="text-xs text-zinc-500 mt-0.5">녹화 영상 분석</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
