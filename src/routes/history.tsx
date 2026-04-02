import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getAllSessions, deleteSession } from '../lib/db/sessions';
import type { Session } from '../types/analysis';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    getAllSessions().then(setSessions);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  if (sessions.length === 0) {
    return (
      <div className="pt-10 pb-4">
        <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed] text-stone-800 mb-8">분석 기록</h2>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
          </div>
          <p className="text-stone-400 text-sm">아직 분석 기록이 없습니다</p>
          <Link to="/analyze" className="text-amber-500 text-sm mt-3 cursor-pointer hover:text-amber-600 transition-colors font-medium">
            첫 턱걸이를 분석해 보세요
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10 pb-4">
      <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed] text-stone-800 mb-5">분석 기록</h2>
      <div className="space-y-2.5">
        {sessions.map((session) => {
          const rounded = Math.round(session.overallScore);
          const angleLabel = session.angle === 'front' ? '정면' : session.angle === 'back' ? '후면' : '측면';
          return (
            <Link
              key={session.id}
              to="/result/$id"
              params={{ id: session.id }}
              className="flex items-center surface-card rounded-xl px-4 py-3.5 cursor-pointer hover:bg-stone-50 active:scale-[0.99] transition-all"
            >
              {/* Score badge */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-stone-100 flex flex-col items-center justify-center mr-4">
                <span className={`text-lg font-bold font-[Barlow_Condensed] tabular-nums leading-none ${scoreColor(rounded)}`}>
                  {rounded}
                </span>
                <span className="text-[9px] text-stone-400 mt-0.5">점</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-700">
                  {session.totalReps}회 · {session.sets.length}세트
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {new Date(session.date).toLocaleDateString('ko-KR')} · {angleLabel} · {session.inputMode === 'camera' ? '카메라' : '업로드'}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(session.id); }}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer ml-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
