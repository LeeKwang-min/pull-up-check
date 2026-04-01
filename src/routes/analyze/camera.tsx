import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef, useEffect, useState } from 'react';
import { CameraControls } from '../../components/camera/CameraControls';
import { LiveStats } from '../../components/analysis/LiveStats';
import { LandmarkOverlay } from '../../components/analysis/LandmarkOverlay';
import { useAnalysisStore } from '../../stores/analysis-store';
import { PoseAnalyzer } from '../../lib/pose-analyzer';
import type { CameraAngle } from '../../types/analysis';

type SearchParams = { angle: CameraAngle };

export const Route = createFileRoute('/analyze/camera')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    angle: (search.angle as CameraAngle) || 'back',
  }),
  component: CameraAnalysisPage,
});

function CameraAnalysisPage() {
  const { angle } = Route.useSearch();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyzerRef = useRef<PoseAnalyzer | null>(null);
  const animationRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // 카메라 시작
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('카메라 접근이 거부되었습니다. 권한을 허용해 주세요.');
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animationRef.current);
      analyzerRef.current?.destroy();
    };
  }, []);

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
    navigate({ to: '/result/$id', params: { id: sessionId } });
  }, [angle, repCount, nextSet, stopAnalysis, reset, navigate]);

  return (
    <div className="py-4 space-y-4">
      <div className="relative bg-black rounded-2xl overflow-hidden">
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
