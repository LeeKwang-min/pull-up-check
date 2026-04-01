import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoDropzone } from '../../components/upload/VideoDropzone';
import { ProgressBar } from '../../components/shared/ProgressBar';
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

export const Route = createFileRoute('/analyze/upload')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    angle: (search.angle as CameraAngle) || 'back',
  }),
  component: UploadAnalysisPage,
});

interface FrameData {
  time: number;
  landmarks: LandmarkSnapshot;
}

function UploadAnalysisPage() {
  const { angle } = Route.useSearch();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 프레임별 랜드마크 저장 (비디오 재생 시 스켈레톤 동기화용)
  const frameLandmarksRef = useRef<FrameData[]>([]);
  const [playbackLandmarks, setPlaybackLandmarks] = useState<LandmarkSnapshot | null>(null);
  const playbackAnimRef = useRef<number>(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const { landmarks, progress, updateLandmarks, updateProgress, addRep, addAlert, nextSet, reset } =
    useAnalysisStore();
  const analyzerRef = useRef<PoseAnalyzer | null>(null);

  const handleFileSelected = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setError(null);
    setAnalysisComplete(false);
    setSessionId(null);
    frameLandmarksRef.current = [];
  }, []);

  const handleAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);
    frameLandmarksRef.current = [];

    const analyzer = new PoseAnalyzer(angle, {
      onLandmarks: (data, timestamp) => {
        updateLandmarks(data);
        frameLandmarksRef.current.push({ time: timestamp, landmarks: data });
      },
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
    const fps = 15;
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

    // 밸런스 점수 & 비대칭 상세 계산 (analyzer destroy 전에)
    const balanceScore = analyzer.getBalanceScore();
    const asymmetryDetails = analyzer.getAsymmetryDetails();
    analyzer.destroy();
    analyzerRef.current = null;

    // 현재 렙을 세트로 마감
    nextSet();

    // 세션 저장
    const newSessionId = crypto.randomUUID();
    const { saveSession } = await import('../../lib/db/sessions');
    const store = useAnalysisStore.getState();
    const allSets = store.sets;

    await saveSession({
      id: newSessionId,
      date: new Date(),
      angle,
      inputMode: 'upload',
      sets: allSets,
      overallScore:
        allSets.length > 0
          ? allSets.reduce((s, set) => s + set.averageFormScore, 0) / allSets.length
          : 0,
      balanceScore,
      asymmetryDetails,
      totalReps: allSets.reduce((s, set) => s + set.reps.length, 0),
      duration: Math.round(duration),
    });

    setAnalyzing(false);
    setAnalysisComplete(true);
    setSessionId(newSessionId);

    // 비디오를 처음으로 되감기
    video.currentTime = 0;
  }, [angle, error, updateLandmarks, addRep, addAlert, updateProgress, nextSet]);

  // 분석 완료 후 세션 로드 & 스토어 정리
  useEffect(() => {
    if (sessionId) {
      getSession(sessionId).then((s) => {
        setSession(s ?? null);
        reset();
      });
    }
  }, [sessionId, reset]);

  // 비디오 재생 시 스켈레톤 동기화
  useEffect(() => {
    if (!analysisComplete) return;

    const video = videoRef.current;
    if (!video) return;

    function syncLandmarks() {
      if (!video) return;
      const currentTimeMs = video.currentTime * 1000;
      const frames = frameLandmarksRef.current;

      // 이진 탐색으로 가장 가까운 프레임 찾기
      let lo = 0;
      let hi = frames.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (frames[mid].time < currentTimeMs) lo = mid + 1;
        else hi = mid;
      }

      if (frames.length > 0) {
        const idx = Math.min(lo, frames.length - 1);
        setPlaybackLandmarks(frames[idx].landmarks);
      }

      if (!video.paused) {
        playbackAnimRef.current = requestAnimationFrame(syncLandmarks);
      }
    }

    const onPlay = () => {
      playbackAnimRef.current = requestAnimationFrame(syncLandmarks);
    };
    const onPause = () => {
      cancelAnimationFrame(playbackAnimRef.current);
    };
    const onSeeked = () => {
      syncLandmarks();
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);

    // 초기 프레임 표시
    syncLandmarks();

    return () => {
      cancelAnimationFrame(playbackAnimRef.current);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [analysisComplete]);

  const handlePlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, []);

  // 현재 표시할 랜드마크 결정
  const displayLandmarks = analysisComplete ? playbackLandmarks : landmarks;

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
              controls={analysisComplete}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDimensions({ width: v.videoWidth, height: v.videoHeight });
              }}
              className="w-full"
            />
            <LandmarkOverlay
              landmarks={displayLandmarks}
              width={dimensions.width}
              height={dimensions.height}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {analysisComplete ? (
            <div className="space-y-4">
              <p className="text-center text-sm text-stone-400">
                영상을 재생하여 스켈레톤 분석을 확인하세요
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-stone-500">배속</span>
                {[0.25, 0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRate(rate)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      playbackRate === rate
                        ? 'bg-amber-500 text-black'
                        : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {session && (
                <>
                  <div ref={reportRef} className="space-y-4">
                    <h3 className="text-lg font-bold uppercase tracking-wider font-[Barlow_Condensed]">분석 리포트</h3>
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
                </>
              )}
            </div>
          ) : loading ? (
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
