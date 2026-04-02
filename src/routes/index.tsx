import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { getLatestSession } from '../lib/db/sessions';
import type { Session } from '../types/analysis';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function scoreGrade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'EXCELLENT', color: 'text-amber-500' };
  if (score >= 80) return { label: 'GREAT', color: 'text-amber-500' };
  if (score >= 60) return { label: 'GOOD', color: 'text-stone-500' };
  return { label: 'NEEDS WORK', color: 'text-stone-400' };
}

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

  const grade = score !== null ? scoreGrade(score) : null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-6rem)] pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-stone-800">풀업 체크</span>
        </div>
        <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#78716C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>

      {/* Score Section */}
      <div className="flex flex-col items-center flex-1 justify-center -mt-4">
        <p className="section-label mb-2">LATEST ANALYSIS</p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-800 mb-10">오늘의 턱걸이</h1>

        {/* Large Score Circle */}
        <div className="score-circle flex flex-col items-center justify-center mb-10">
          <span className="text-6xl font-bold text-stone-800 font-[Barlow_Condensed] tabular-nums leading-none">
            {score ?? '--'}
          </span>
          {grade && (
            <span className={`text-sm font-bold uppercase tracking-widest mt-2 font-[Barlow_Condensed] ${grade.color}`}>
              {grade.label}
            </span>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 w-full">
          <div className="surface-card rounded-2xl py-4 px-3 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="8" width="4" height="13" rx="1"/><rect x="17" y="4" width="4" height="17" rx="1"/></svg>
            </div>
            <span className="text-xl font-bold font-[Barlow_Condensed] tabular-nums text-stone-800">
              {totalReps ?? '--'}
            </span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">TOTAL REPS</span>
          </div>
          <div className="surface-card rounded-2xl py-4 px-3 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="16" x2="20" y2="16"/></svg>
            </div>
            <span className="text-xl font-bold font-[Barlow_Condensed] tabular-nums text-stone-800">
              {setCount ?? '--'}
            </span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">SETS</span>
          </div>
          <div className="surface-card rounded-2xl py-4 px-3 flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <span className="text-xl font-bold font-[Barlow_Condensed] tabular-nums text-stone-800">
              {avgTempo ? `${avgTempo}s` : '--'}
            </span>
            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mt-0.5">AVG TEMPO</span>
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3 mt-8">
        <Link
          to="/analyze"
          className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-4 rounded-2xl text-center uppercase tracking-widest text-sm font-[Barlow_Condensed] cursor-pointer shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
        >
          자세 분석하기
        </Link>
        <Link
          to="/history"
          className="surface-card text-stone-500 font-semibold py-3.5 rounded-2xl text-center text-sm cursor-pointer hover:bg-stone-50 active:scale-[0.98] transition-all"
        >
          지난 기록 비교하기
        </Link>
      </div>

      <p className="text-[11px] text-stone-400 text-center mt-6 leading-relaxed">
        영상은 기기에서만 처리됩니다. 서버 전송 없음.
      </p>
    </div>
  );
}
