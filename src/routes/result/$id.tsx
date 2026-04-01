import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { getSession } from '../../lib/db/sessions';
import { ScoreCard } from '../../components/report/ScoreCard';
import { SetChart } from '../../components/report/SetChart';
import { BodyDiagram } from '../../components/report/BodyDiagram';
import { FeedbackList } from '../../components/report/FeedbackList';
import { ReportExport } from '../../components/report/ReportExport';
import type { Session } from '../../types/analysis';

export const Route = createFileRoute('/result/$id')({
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession(id).then((s) => setSession(s ?? null));
  }, [id]);

  if (!session) {
    return <div className="py-8 text-center text-zinc-500">로딩 중...</div>;
  }

  return (
    <div className="py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">분석 리포트</h2>
        <p className="text-xs text-zinc-500">
          {new Date(session.date).toLocaleDateString()} · {session.angle} 뷰 · {session.totalReps} 총 회
        </p>
      </div>

      <div ref={reportRef} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard label="종합 점수" score={session.overallScore} />
          <ScoreCard label="밸런스 점수" score={session.balanceScore} color="#10b981" />
        </div>
        <SetChart sets={session.sets} />
        {(session.angle === 'front' || session.angle === 'back') && <BodyDiagram sets={session.sets} />}
        <FeedbackList sets={session.sets} />
      </div>

      <ReportExport targetRef={reportRef} />
    </div>
  );
}
