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
        <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed]">새 분석</h2>
        <p className="text-stone-500 text-sm mt-1">촬영 각도와 입력 방식을 선택하세요</p>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-stone-400 uppercase tracking-wider text-xs font-[Barlow_Condensed]">촬영 각도</label>
        <AngleSelector value={angle} onChange={setAngle} />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-stone-400 uppercase tracking-wider text-xs font-[Barlow_Condensed]">입력 방식</label>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/analyze/camera"
            search={{ angle }}
            className="bg-stone-900 hover:bg-stone-800 rounded-2xl p-5 text-center transition-colors border border-stone-800 cursor-pointer"
          >
            <svg className="mx-auto mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <div className="font-semibold text-sm text-stone-200">실시간 카메라</div>
            <div className="text-xs text-stone-500 mt-0.5">실시간 측정</div>
          </Link>
          <Link
            to="/analyze/upload"
            search={{ angle }}
            className="bg-stone-900 hover:bg-stone-800 rounded-2xl p-5 text-center transition-colors border border-stone-800 cursor-pointer"
          >
            <svg className="mx-auto mb-2" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <div className="font-semibold text-sm text-stone-200">영상 업로드</div>
            <div className="text-xs text-stone-500 mt-0.5">녹화 영상 분석</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
