import { createFileRoute } from '@tanstack/react-router';
import { AngleSelector } from '../components/shared/AngleSelector';
import { useSessionStore } from '../stores/session-store';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { defaultAngle, setDefaultAngle } = useSessionStore();

  return (
    <div className="py-6 space-y-6">
      <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed]">설정</h2>
      <div className="space-y-3">
        <label className="text-xs font-medium text-stone-300 uppercase tracking-wider font-[Barlow_Condensed]">기본 촬영 각도</label>
        <AngleSelector value={defaultAngle} onChange={setDefaultAngle} />
      </div>
      <div className="border-t border-stone-700 pt-4">
        <p className="text-xs text-stone-500">풀업 체크 v1.0.0 · 모든 처리는 기기에서 · 데이터 업로드 없음</p>
      </div>
    </div>
  );
}
