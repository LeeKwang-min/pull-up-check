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
    return <div className="pt-20 text-center text-stone-400 text-sm">로딩 중...</div>;
  }

  const angleLabel = session.angle === 'front' ? '정면' : session.angle === 'back' ? '후면' : '측면';

  return (
    <div className="pt-10 pb-4 space-y-5">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed] text-stone-800">분석 리포트</h2>
        <p className="text-[11px] text-stone-400 mt-1.5">
          {new Date(session.date).toLocaleDateString('ko-KR')} · {angleLabel} · {session.totalReps}회
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <ScoreCard label="종합 점수" score={session.overallScore} />
          <ScoreCard label={session.angle === 'side' ? '폼 안정성' : '좌우 밸런스'} score={session.balanceScore} color="#10b981" />
        </div>
        <div ref={reportRef} className="space-y-4">
          <SetChart sets={session.sets} />
          {(session.angle === 'front' || session.angle === 'back') && (
            <BodyDiagram asymmetryDetails={session.asymmetryDetails} />
          )}
        </div>
        <FeedbackList
          sets={session.sets}
          overallScore={session.overallScore}
          balanceScore={session.balanceScore}
          asymmetryDetails={session.asymmetryDetails}
          totalReps={session.totalReps}
          angle={session.angle}
        />
      </div>

      <ReportExport targetRef={reportRef} />
    </div>
  );
}
