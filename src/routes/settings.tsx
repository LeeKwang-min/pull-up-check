import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { AngleSelector } from '../components/shared/AngleSelector';
import { useSessionStore } from '../stores/session-store';
import { db } from '../lib/db';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { defaultAngle, setDefaultAngle } = useSessionStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleReset = async () => {
    await db.sessions.clear();
    setConfirmOpen(false);
    setCleared(true);
    timerRef.current = setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="pt-10 pb-4 space-y-8">
      <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed]">설정</h2>

      {/* Angle Setting */}
      <div className="surface-card rounded-2xl p-5 space-y-4">
        <label className="section-label">기본 촬영 각도</label>
        <AngleSelector value={defaultAngle} onChange={setDefaultAngle} />
      </div>

      {/* Data Management */}
      <div className="surface-card rounded-2xl p-5 space-y-4">
        <label className="section-label">데이터 관리</label>
        {cleared ? (
          <div className="py-3 text-center text-sm text-emerald-400 font-medium">초기화 완료</div>
        ) : !confirmOpen ? (
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full py-3 rounded-xl border border-red-500/20 text-red-400/80 text-sm font-medium hover:bg-red-500/5 active:scale-[0.98] transition-all cursor-pointer"
          >
            모든 기록 초기화
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] text-stone-400 leading-relaxed">
              모든 분석 기록이 영구 삭제됩니다. 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 active:scale-[0.97] transition-all cursor-pointer"
              >
                삭제
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-800 text-stone-400 text-sm font-medium hover:bg-stone-700 active:scale-[0.97] transition-all cursor-pointer"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-2">
        <p className="text-[11px] text-stone-600 text-center leading-relaxed">
          풀업 체크 v1.0.0 · 모든 처리는 기기에서 · 데이터 업로드 없음
        </p>
      </div>
    </div>
  );
}
