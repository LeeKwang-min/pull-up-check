import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useCallback } from 'react';
import { VideoDropzone } from '../../components/upload/VideoDropzone';
import { ProgressBar } from '../../components/shared/ProgressBar';
import { LandmarkOverlay } from '../../components/analysis/LandmarkOverlay';
import { useAnalysisStore } from '../../stores/analysis-store';
import { PoseAnalyzer } from '../../lib/pose-analyzer';
import type { CameraAngle } from '../../types/analysis';

type SearchParams = { angle: CameraAngle };

export const Route = createFileRoute('/analyze/upload')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    angle: (search.angle as CameraAngle) || 'back',
  }),
  component: UploadAnalysisPage,
});

function UploadAnalysisPage() {
  const { angle } = Route.useSearch();
  const navigate = useNavigate();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { landmarks, progress, updateLandmarks, updateProgress, addRep, addAlert, nextSet, reset } =
    useAnalysisStore();
  const analyzerRef = useRef<PoseAnalyzer | null>(null);

  const handleFileSelected = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);

    const analyzer = new PoseAnalyzer(angle, {
      onLandmarks: (data) => updateLandmarks(data),
      onRep: (result) => addRep(result.formScore, result.details, result.tempo, result.rom),
      onFormAlert: (issue) => addAlert(issue),
      onError: (msg) => {
        setError(msg);
        setLoading(false);
        setAnalyzing(false);
      },
    });

    await analyzer.init();
    analyzerRef.current = analyzer;

    if (error) return;

    setLoading(false);
    setAnalyzing(true);

    const duration = video.duration;
    const fps = 10;
    const frameStep = 1 / fps;
    let currentTime = 0;

    while (currentTime < duration) {
      video.currentTime = currentTime;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      analyzer.processFrame(video, currentTime * 1000);
      updateProgress((currentTime / duration) * 100);

      // UI 업데이트를 위한 yield
      await new Promise((r) => setTimeout(r, 0));

      currentTime += frameStep;
    }

    updateProgress(100);

    // 밸런스 점수 계산 (analyzer destroy 전에)
    const balanceScore = analyzer.getBalanceScore();
    analyzer.destroy();
    analyzerRef.current = null;

    // 현재 렙을 세트로 마감
    nextSet();

    // 세션 저장
    const sessionId = crypto.randomUUID();
    const { saveSession } = await import('../../lib/db/sessions');
    const store = useAnalysisStore.getState();
    const allSets = store.sets;

    await saveSession({
      id: sessionId,
      date: new Date(),
      angle,
      inputMode: 'upload',
      sets: allSets,
      overallScore:
        allSets.length > 0
          ? allSets.reduce((s, set) => s + set.averageFormScore, 0) / allSets.length
          : 0,
      balanceScore,
      totalReps: allSets.reduce((s, set) => s + set.reps.length, 0),
      duration: Math.round(duration),
    });

    reset();
    navigate({ to: '/result/$id', params: { id: sessionId } });
  }, [angle, error, updateLandmarks, addRep, addAlert, updateProgress, reset, navigate]);

  return (
    <div className="py-4 space-y-4">
      {!videoUrl ? (
        <VideoDropzone onFileSelected={handleFileSelected} />
      ) : (
        <>
          <div className="relative bg-black rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              muted
              preload="auto"
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

          {loading ? (
            <div className="text-center py-4">
              <div className="text-sm text-stone-400">MediaPipe 모델 로딩 중...</div>
              <div className="text-xs text-stone-500 mt-1">첫 실행 시 모델 다운로드가 필요합니다</div>
            </div>
          ) : analyzing ? (
            <ProgressBar percent={progress} label="영상 분석 중..." />
          ) : (
            <button
              onClick={handleAnalyze}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-amber-500/20 uppercase tracking-widest text-sm font-[Barlow_Condensed] cursor-pointer"
            >
              분석 시작
            </button>
          )}
        </>
      )}
    </div>
  );
}
