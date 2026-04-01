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
    return <div className="py-8 text-center text-stone-400">로딩 중...</div>;
  }

  const angleLabel = session.angle === 'front' ? '정면' : session.angle === 'back' ? '후면' : '측면';

  return (
    <div className="py-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed]">분석 리포트</h2>
        <p className="text-xs text-stone-400 mt-1">
          {new Date(session.date).toLocaleDateString()} · {angleLabel} · {session.totalReps}회
        </p>
      </div>

      <div ref={reportRef} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard label="종합 점수" score={session.overallScore} />
          <ScoreCard label="밸런스 점수" score={session.balanceScore} color="#10b981" />
        </div>
        <SetChart sets={session.sets} />
        {(session.angle === 'front' || session.angle === 'back') && (
          <BodyDiagram sets={session.sets} asymmetryDetails={session.asymmetryDetails} />
        )}
        <FeedbackList sets={session.sets} />
      </div>

      <ReportExport targetRef={reportRef} />
    </div>
  );
}
