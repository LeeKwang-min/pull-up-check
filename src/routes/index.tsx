import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getLatestSession } from '../lib/db/sessions';
import type { Session } from '../types/analysis';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const [latest, setLatest] = useState<Session | null>(null);

  useEffect(() => {
    getLatestSession().then((s) => { if (s) setLatest(s); });
  }, []);

  const score = latest ? Math.round(latest.overallScore) : null;
  const totalReps = latest?.totalReps ?? null;
  const setCount = latest ? latest.sets.length : null;
  const avgTempo = latest
    ? (() => {
        const tempos = latest.sets.flatMap((s) => s.reps.map((r) => r.tempo).filter((t) => t > 0));
        return tempos.length > 0 ? (tempos.reduce((a, b) => a + b, 0) / tempos.length / 1000).toFixed(1) : null;
      })()
    : null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] pt-10 pb-4">
      {/* Header */}
      <div className="mb-8">
        <p className="section-label mb-1">오늘의 턱걸이</p>
        <h1 className="text-3xl font-bold tracking-tight">
          풀업 <span className="text-amber-500">체크</span>
        </h1>
      </div>

      {/* Score Card */}
      <div className="surface-card glow-amber rounded-2xl p-6 relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-500/[0.04] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-amber-500/[0.03] blur-2xl pointer-events-none" />

        <div className="relative">
          {/* Main score */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold text-amber-500 leading-none font-[Barlow_Condensed] tabular-nums">
              {score ?? '--'}
            </span>
            <span className="text-base text-stone-500 font-medium">점</span>
          </div>
          <p className="text-xs text-stone-500 mt-1.5">최근 종합 점수</p>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-stone-800 via-stone-700/50 to-transparent my-5" />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-lg font-bold font-[Barlow_Condensed] tabular-nums text-stone-100">
                {totalReps ?? '--'}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">총 횟수</div>
            </div>
            <div>
              <div className="text-lg font-bold font-[Barlow_Condensed] tabular-nums text-stone-100">
                {setCount ?? '--'}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">세트</div>
            </div>
            <div>
              <div className="text-lg font-bold font-[Barlow_Condensed] tabular-nums text-stone-100">
                {avgTempo ? `${avgTempo}s` : '--'}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">평균 템포</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 mt-auto pt-10">
        <Link
          to="/analyze"
          className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-amber-600 text-stone-950 font-bold py-4 rounded-2xl text-center uppercase tracking-widest text-sm font-[Barlow_Condensed] cursor-pointer shadow-lg shadow-amber-500/15 active:scale-[0.98] transition-transform"
        >
          분석 시작
        </Link>
        <Link
          to="/history"
          className="surface-card text-stone-300 font-semibold py-3.5 rounded-2xl text-center text-sm cursor-pointer hover:bg-stone-800/60 active:scale-[0.98] transition-all"
        >
          기록 보기
        </Link>
      </div>

      <p className="text-[11px] text-stone-600 text-center mt-6 leading-relaxed">
        모든 처리는 기기에서 이루어집니다. 영상 데이터는 서버로 전송되지 않습니다.
      </p>
    </div>
  );
}
