import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useRef, useEffect, useState } from 'react';
import { CameraControls } from '../../components/camera/CameraControls';
import { LiveStats } from '../../components/analysis/LiveStats';
import { LandmarkOverlay } from '../../components/analysis/LandmarkOverlay';
import { ScoreCard } from '../../components/report/ScoreCard';
import { SetChart } from '../../components/report/SetChart';
import { BodyDiagram } from '../../components/report/BodyDiagram';
import { FeedbackList } from '../../components/report/FeedbackList';
import { ReportExport } from '../../components/report/ReportExport';
import { useAnalysisStore } from '../../stores/analysis-store';
import { PoseAnalyzer } from '../../lib/pose-analyzer';
import { getSession } from '../../lib/db/sessions';
import type { CameraAngle, Session } from '../../types/analysis';

type SearchParams = { angle: CameraAngle };

export const Route = createFileRoute('/analyze/camera')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    angle: (search.angle as CameraAngle) || 'back',
  }),
  component: CameraAnalysisPage,
});

function CameraAnalysisPage() {
  const { angle } = Route.useSearch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyzerRef = useRef<PoseAnalyzer | null>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const {
    isAnalyzing,
    repCount,
    currentSet,
    landmarks,
    alerts,
    startAnalysis,
    stopAnalysis,
    addRep,
    addAlert,
    updateLandmarks,
    nextSet,
    reset,
  } = useAnalysisStore();

  // 카메라 시작 (facingMode 변경 시 재시작)
  useEffect(() => {
    async function startCamera() {
      // 기존 스트림 정리
      streamRef.current?.getTracks().forEach((t) => t.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: 640, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('카메라 접근이 거부되었습니다. 권한을 허용해 주세요.');
      }
    }

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animationRef.current);
      analyzerRef.current?.destroy();
    };
  }, [facingMode]);

  // 분석 루프
  useEffect(() => {
    if (!isAnalyzing) {
      cancelAnimationFrame(animationRef.current);
      return;
    }

    function loop() {
      const video = videoRef.current;
      if (video && video.readyState >= 2 && analyzerRef.current) {
        analyzerRef.current.processFrame(video, performance.now());
      }
      animationRef.current = requestAnimationFrame(loop);
    }

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isAnalyzing]);

  const handleStartStop = useCallback(async () => {
    if (isAnalyzing) {
      cancelAnimationFrame(animationRef.current);
      analyzerRef.current?.destroy();
      analyzerRef.current = null;
      stopAnalysis();
    } else {
      setLoading(true);
      setError(null);

      const analyzer = new PoseAnalyzer(angle, {
        onLandmarks: (data) => updateLandmarks(data),
        onRep: (result) => addRep(result.formScore, result.details, result.tempo, result.rom),
        onFormAlert: (issue) => addAlert(issue),
        onError: (msg) => {
          setError(msg);
          setLoading(false);
        },
      });

      await analyzer.init();
      analyzerRef.current = analyzer;
      setLoading(false);
      startAnalysis();
    }
  }, [isAnalyzing, angle, startAnalysis, stopAnalysis, addRep, addAlert, updateLandmarks]);

  const handleFlipCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, []);

  const handleNextSet = useCallback(() => {
    nextSet();
    analyzerRef.current?.resetSet();
  }, [nextSet]);

  const handleFinish = useCallback(async () => {
    if (repCount > 0) {
      nextSet();
    }
    cancelAnimationFrame(animationRef.current);

    // 밸런스 점수 & 비대칭 상세 계산 (destroy 전에)
    const balanceScore = analyzerRef.current?.getBalanceScore() ?? 0;
    const asymmetryDetails = analyzerRef.current?.getAsymmetryDetails();
    analyzerRef.current?.destroy();
    analyzerRef.current = null;
    stopAnalysis();

    // 카메라 스트림 중지
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    const sessionId = crypto.randomUUID();
    const { saveSession } = await import('../../lib/db/sessions');
    const allSets = useAnalysisStore.getState().sets;

    await saveSession({
      id: sessionId,
      date: new Date(),
      angle,
      inputMode: 'camera',
      sets: allSets,
      overallScore:
        allSets.length > 0
          ? allSets.reduce((s, set) => s + set.averageFormScore, 0) / allSets.length
          : 0,
      balanceScore,
      asymmetryDetails,
      totalReps: allSets.reduce((s, set) => s + set.reps.length, 0),
      duration: 0,
    });

    reset();

    const saved = await getSession(sessionId);
    setSession(saved ?? null);
    setAnalysisComplete(true);
  }, [angle, repCount, nextSet, stopAnalysis, reset]);

  if (analysisComplete && session) {
    return (
      <div className="py-4 space-y-4">
        <div className="space-y-4">
          <h3 className="text-lg font-bold uppercase tracking-wider font-[Barlow_Condensed]">분석 리포트</h3>
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard label="종합 점수" score={session.overallScore} />
            <ScoreCard label="밸런스 점수" score={session.balanceScore} color="#10b981" />
          </div>
          <div ref={reportRef} className="space-y-4">
            <SetChart sets={session.sets} />
            {(session.angle === 'front' || session.angle === 'back') && (
              <BodyDiagram sets={session.sets} asymmetryDetails={session.asymmetryDetails} />
            )}
          </div>
          <FeedbackList sets={session.sets} />
        </div>
        <ReportExport targetRef={reportRef} />
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <div className="relative bg-black rounded-2xl overflow-hidden">
        <div className={facingMode === 'user' ? 'scale-x-[-1]' : ''}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setDimensions({ width: v.videoWidth, height: v.videoHeight });
            }}
            className="w-full"
          />
          <LandmarkOverlay
            landmarks={landmarks}
            width={dimensions.width}
            height={dimensions.height}
          />
        </div>
        <button
          onClick={handleFlipCamera}
          disabled={isAnalyzing}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center transition-opacity cursor-pointer disabled:opacity-30"
          aria-label="카메라 전환"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
            <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
            <circle cx="10" cy="12" r="1" />
            <path d="m15 2 3 3-3 3" />
            <path d="m9 22-3-3 3-3" />
          </svg>
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <LiveStats repCount={repCount} currentSet={currentSet} alerts={alerts} />

      {loading ? (
        <div className="text-center py-4">
          <div className="text-sm text-stone-300">MediaPipe 모델 로딩 중...</div>
          <div className="text-xs text-stone-400 mt-1">첫 실행 시 모델 다운로드가 필요합니다</div>
        </div>
      ) : (
        <CameraControls
          isAnalyzing={isAnalyzing}
          onStartStop={handleStartStop}
          onNextSet={handleNextSet}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
