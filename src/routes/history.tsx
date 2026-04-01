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
      <div className="py-16 text-center">
        <p className="text-zinc-500">아직 기록이 없습니다</p>
        <Link to="/analyze" className="text-blue-400 text-sm mt-2 inline-block">첫 분석을 시작해 보세요</Link>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-3">
      <h2 className="text-xl font-bold">운동 기록</h2>
      {sessions.map((session) => (
        <Link key={session.id} to="/result/$id" params={{ id: session.id }} className="block bg-zinc-900 hover:bg-zinc-800 rounded-xl p-4 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-sm">{session.totalReps} 회 · {session.sets.length} 세트</div>
              <div className="text-xs text-zinc-500 mt-0.5">{new Date(session.date).toLocaleDateString()} · {session.angle} 뷰 · {session.inputMode}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-lg font-bold text-blue-400">{Math.round(session.overallScore)}</div>
                <div className="text-xs text-zinc-500">점</div>
              </div>
              <button onClick={(e) => { e.preventDefault(); handleDelete(session.id); }} className="text-zinc-600 hover:text-red-400 text-sm transition-colors">✕</button>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
