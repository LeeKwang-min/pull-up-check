import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getAllSessions, deleteSession } from '../lib/db/sessions';
import type { Session } from '../types/analysis';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

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
      <div className="py-20 text-center">
        <svg className="mx-auto mb-4" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#57534E" strokeWidth="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
        <p className="text-stone-400">아직 기록이 없습니다</p>
        <Link to="/analyze" className="text-amber-500 text-sm mt-3 inline-block cursor-pointer hover:text-amber-400 transition-colors">첫 분석을 시작해 보세요</Link>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-3">
      <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed]">운동 기록</h2>
      {sessions.map((session) => (
        <Link key={session.id} to="/result/$id" params={{ id: session.id }} className="block bg-stone-800 hover:bg-stone-700 rounded-2xl p-4 transition-colors border border-stone-700 cursor-pointer">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-sm">{session.totalReps}회 · {session.sets.length}세트</div>
              <div className="text-xs text-stone-400 mt-0.5">{new Date(session.date).toLocaleDateString()} · {session.angle === 'front' ? '정면' : session.angle === 'back' ? '후면' : '측면'} · {session.inputMode === 'camera' ? '카메라' : '업로드'}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xl font-bold text-amber-500 font-[Barlow_Condensed]">{Math.round(session.overallScore)}</div>
                <div className="text-xs text-stone-400">점</div>
              </div>
              <button onClick={(e) => { e.preventDefault(); handleDelete(session.id); }} className="text-stone-700 hover:text-red-400 text-sm transition-colors cursor-pointer p-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
