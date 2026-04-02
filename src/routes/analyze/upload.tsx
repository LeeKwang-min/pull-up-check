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
  const abortRef = useRef(false);

  // 컴포넌트 언마운트 시 분석 중단 및 리소스 정리
  useEffect(() => {
    abortRef.current = false;
    return () => {
      abortRef.current = true;
      analyzerRef.current?.destroy();
      analyzerRef.current = null;
    };
  }, []);

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

    abortRef.current = false;
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
      if (abortRef.current) break;

      video.currentTime = currentTime;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      if (abortRef.current) break;

      analyzer.processFrame(video, currentTime * 1000);
      updateProgress((currentTime / duration) * 100);

      // UI 업데이트를 위한 yield
      await new Promise((r) => setTimeout(r, 0));

      currentTime += frameStep;
    }

    // 중단된 경우 리소스 정리 후 early return
    if (abortRef.current) {
      analyzer.destroy();
      analyzerRef.current = null;
      setAnalyzing(false);
      return;
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
    <div className="pt-8 pb-4 space-y-4">
      {!videoUrl ? (
        <>
          <VideoDropzone onFileSelected={handleFileSelected} />
          <div className="bg-stone-50 border border-stone-200 rounded-2xl px-5 py-4 space-y-3">
            <h4 className="text-sm font-bold text-stone-700 font-[Barlow_Condensed] uppercase tracking-wider">
              촬영 가이드
            </h4>
            <ul className="space-y-2.5 text-[13px] text-stone-600">
              <li className="flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[11px] font-bold mt-0.5">1</span>
                <span><strong className="text-stone-800">바(Bar)~골반까지</strong> 반드시 화면에 나오게 촬영하세요. 렙 카운팅과 어깨·팔꿈치 비대칭을 분석합니다.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[11px] font-bold mt-0.5">2</span>
                <span><strong className="text-stone-800">발끝까지 보이면</strong> 정밀 분석이 가능합니다. 키핑, 몸통 흔들림, 다리 벌어짐까지 체크합니다.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[11px] font-bold mt-0.5">3</span>
                <span><strong className="text-stone-800">카메라 고정</strong> + 2~3m 거리에서 촬영하세요. 역광을 피하면 정확도가 올라갑니다.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center text-[11px] font-bold mt-0.5">!</span>
                <span>
                  {angle === 'side'
                    ? '측면 촬영: 몸통 흔들림과 키핑 감지에 최적화되어 있습니다.'
                    : `${angle === 'front' ? '정면' : '후면'} 촬영: 좌우 밸런스와 어깨·팔꿈치 대칭을 측정합니다.`}
                </span>
              </li>
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg shadow-black/40">
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
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-600">
              {error}
            </div>
          )}

          {analysisComplete ? (
            <div className="space-y-5">
              <p className="text-center text-[13px] text-stone-500">
                영상을 재생하면 관절 트래킹이 오버레이됩니다
              </p>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[11px] text-stone-600 mr-1">배속</span>
                {[0.25, 0.5, 1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRate(rate)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer active:scale-95 transition-all ${
                      playbackRate === rate
                        ? 'bg-amber-500 text-white'
                        : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {session && (
                <>
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
                </>
              )}
            </div>
          ) : loading ? (
            <div className="text-center py-6">
              <div className="text-sm text-stone-600 font-medium">자세 인식 모델 준비 중...</div>
              <div className="text-[11px] text-stone-400 mt-1.5">최초 1회만 다운로드됩니다 (약 10MB)</div>
            </div>
          ) : analyzing ? (
            <ProgressBar percent={progress} label="관절 좌표를 추출하고 있습니다..." />
          ) : (
            <button
              onClick={handleAnalyze}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-4 rounded-2xl uppercase tracking-widest text-sm font-[Barlow_Condensed] cursor-pointer shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
            >
              이 영상 분석하기
            </button>
          )}
        </>
      )}
    </div>
  );
}
