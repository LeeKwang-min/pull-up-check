import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useRef, useEffect, useState } from 'react';
import { CameraControls } from '../../components/camera/CameraControls';
import { CameraGuideOverlay, type PoseReadyLevel } from '../../components/camera/CameraGuideOverlay';
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
import type { CameraAngle, LandmarkSnapshot, Session } from '../../types/analysis';

type SearchParams = { angle: CameraAngle };

export const Route = createFileRoute('/analyze/camera')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    angle: (search.angle as CameraAngle) || 'back',
  }),
  component: CameraAnalysisPage,
});

/**
 * 포즈 위치 판정 (3단계)
 * - 'none': 랜드마크 부족 또는 프레임 밖
 * - 'basic': 상체(어깨·팔꿈치·손목) 감지 → 렙 카운팅 + 비대칭 분석 가능
 * - 'full': 전신(+ 골반·무릎) 감지 → 키핑·흔들림·다리 벌어짐까지 분석 가능
 */
function checkPosePosition(lm: LandmarkSnapshot): PoseReadyLevel {
  const inFrame = (p: { x: number; y: number; visibility: number }) =>
    p.visibility > 0.5 && p.x > 0.05 && p.x < 0.95 && p.y > 0.02 && p.y < 0.98;

  // 상체 필수 랜드마크 (6개)
  const upper = [
    lm.shoulderLeft, lm.shoulderRight,
    lm.elbowLeft, lm.elbowRight,
    lm.wristLeft, lm.wristRight,
  ];
  const upperOk = upper.filter(inFrame).length >= 5;
  if (!upperOk) return 'none';

  // 하체 랜드마크 (4개)
  const lower = [lm.hipLeft, lm.hipRight, lm.kneeLeft, lm.kneeRight];
  const lowerOk = lower.filter(inFrame).length >= 3;

  return lowerOk ? 'full' : 'basic';
}

const READY_FRAMES = 6; // ~2 s at 3 fps

function CameraAnalysisPage() {
  const { angle } = Route.useSearch();
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyzerRef = useRef<PoseAnalyzer | null>(null);
  const animationRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const preCheckTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isPreCheckingRef = useRef(true);
  const readyCountRef = useRef(0);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [readyLevel, setReadyLevel] = useState<PoseReadyLevel>('none');
  const [guideVisible, setGuideVisible] = useState(true);

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

  // ── 카메라 스트림 ──
  useEffect(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: 640, height: 480 },
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('카메라 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.');
      }
    }

    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  // ── 모델 로드 + 사전 감지 루프 ──
  useEffect(() => {
    let cancelled = false;
    isPreCheckingRef.current = true;
    readyCountRef.current = 0;

    async function init() {
      setLoading(true);
      setError(null);

      const analyzer = new PoseAnalyzer(angle, {
        onLandmarks: (data) => updateLandmarks(data),
        onRep: (result) => {
          if (!isPreCheckingRef.current) {
            addRep(result.formScore, result.details, result.tempo, result.rom);
          }
        },
        onFormAlert: (issue) => {
          if (!isPreCheckingRef.current) addAlert(issue);
        },
        onError: (msg) => {
          setError(msg);
          setLoading(false);
        },
      });

      await analyzer.init();
      if (cancelled) {
        analyzer.destroy();
        return;
      }

      analyzerRef.current = analyzer;
      setModelReady(true);
      setLoading(false);

      // 사전 감지 루프 (~3 fps)
      function preCheckLoop() {
        if (cancelled || !isPreCheckingRef.current) return;

        const video = videoRef.current;
        if (video && video.readyState >= 2 && analyzerRef.current) {
          analyzerRef.current.processFrame(video, performance.now());

          const lm = useAnalysisStore.getState().landmarks;
          if (lm) {
            const level = checkPosePosition(lm);
            if (level !== 'none') {
              readyCountRef.current++;
              if (readyCountRef.current >= READY_FRAMES) setReadyLevel(level);
            } else {
              readyCountRef.current = 0;
              setReadyLevel('none');
            }
          }
        }
        preCheckTimerRef.current = setTimeout(preCheckLoop, 333);
      }
      preCheckLoop();
    }

    init();
    return () => {
      cancelled = true;
      clearTimeout(preCheckTimerRef.current);
      analyzerRef.current?.destroy();
      analyzerRef.current = null;
    };
  }, [angle, addRep, addAlert, updateLandmarks]);

  // ── 가이드 가시성 관리 ──
  useEffect(() => {
    if (isAnalyzing || analysisComplete) {
      setGuideVisible(false);
      return;
    }
    if (readyLevel !== 'none') {
      const timer = setTimeout(() => setGuideVisible(false), 2500);
      return () => clearTimeout(timer);
    }
    setGuideVisible(true);
  }, [readyLevel, isAnalyzing, analysisComplete]);

  // ── 분석 루프 ──
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

  // ── 컴포넌트 언마운트 정리 ──
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      useAnalysisStore.getState().stopAnalysis();
    };
  }, []);

  const handleStartStop = useCallback(() => {
    if (isAnalyzing) {
      cancelAnimationFrame(animationRef.current);
      stopAnalysis();
    } else {
      if (!analyzerRef.current || !modelReady) return;

      isPreCheckingRef.current = false;
      clearTimeout(preCheckTimerRef.current);
      analyzerRef.current.reset();

      setGuideVisible(false);
      startAnalysis();
    }
  }, [isAnalyzing, modelReady, startAnalysis, stopAnalysis]);

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

    const balanceScore = analyzerRef.current?.getBalanceScore() ?? 0;
    const asymmetryDetails = analyzerRef.current?.getAsymmetryDetails();
    analyzerRef.current?.destroy();
    analyzerRef.current = null;
    stopAnalysis();

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
      <div className="pt-10 pb-4 space-y-5">
        <div className="space-y-4">
          <h3 className="text-2xl font-bold uppercase tracking-wider font-[Barlow_Condensed] text-stone-800">분석 리포트</h3>
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

  return (
    <div className="pt-6 pb-4 space-y-4">
      <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg shadow-black/40">
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
        <CameraGuideOverlay
          angle={angle}
          visible={guideVisible}
          readyLevel={readyLevel}
          width={dimensions.width}
          height={dimensions.height}
        />
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
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <LiveStats repCount={repCount} currentSet={currentSet} alerts={alerts} />

      {loading ? (
        <div className="text-center py-6">
          <div className="text-sm text-stone-600 font-medium">자세 인식 모델 준비 중...</div>
          <div className="text-[11px] text-stone-400 mt-1.5">최초 1회만 다운로드됩니다 (약 10MB)</div>
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
