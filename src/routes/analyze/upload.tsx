import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useCallback } from 'react';
import { VideoDropzone } from '../../components/upload/VideoDropzone';
import { ProgressBar } from '../../components/shared/ProgressBar';
import { LandmarkOverlay } from '../../components/analysis/LandmarkOverlay';
import { useAnalysisStore } from '../../stores/analysis-store';
import { PoseWorkerClient } from '../../lib/worker-client';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const { landmarks, progress, updateLandmarks, updateProgress, addRep, reset } = useAnalysisStore();

  const handleFileSelected = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  }, []);

  const handleAnalyze = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setAnalyzing(true);
    const worker = new Worker(
      new URL('../../workers/pose-worker.ts', import.meta.url),
      { type: 'module' },
    );
    const client = new PoseWorkerClient(worker);

    client.onLandmarks = (data) => updateLandmarks(data);
    client.onRep = (_count, formScore, details) => addRep(formScore, details);
    client.onProgress = (p) => updateProgress(p);

    await new Promise<void>((resolve) => {
      client.onReady = resolve;
      client.init({
        angle,
        modelPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      });
    });

    const duration = video.duration;
    const fps = 15;
    const frameInterval = 1000 / fps;
    let currentTime = 0;

    while (currentTime < duration) {
      video.currentTime = currentTime;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      const bitmap = await createImageBitmap(video);
      client.sendFrame(bitmap, currentTime * 1000);
      updateProgress((currentTime / duration) * 100);
      currentTime += frameInterval / 1000;
    }

    updateProgress(100);
    client.stop();

    const sessionId = crypto.randomUUID();
    const { saveSession } = await import('../../lib/db/sessions');
    const store = useAnalysisStore.getState();

    const setData = {
      setNumber: 1,
      reps: store.currentSetReps,
      averageFormScore:
        store.currentSetReps.length > 0
          ? store.currentSetReps.reduce((s, r) => s + r.formScore, 0) / store.currentSetReps.length
          : 0,
      formBreakdownRep: null,
    };

    await saveSession({
      id: sessionId,
      date: new Date(),
      angle,
      inputMode: 'upload',
      sets: [setData],
      overallScore: setData.averageFormScore,
      balanceScore: 0,
      totalReps: store.currentSetReps.length,
      duration: Math.round(duration),
    });

    reset();
    navigate({ to: '/result/$id', params: { id: sessionId } });
  }, [angle, updateLandmarks, addRep, updateProgress, reset, navigate]);

  return (
    <div className="py-4 space-y-4">
      {!videoUrl ? (
        <VideoDropzone onFileSelected={handleFileSelected} />
      ) : (
        <>
          <div className="relative bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              muted
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                setDimensions({ width: v.videoWidth, height: v.videoHeight });
              }}
              className="w-full"
            />
            <LandmarkOverlay landmarks={landmarks} width={dimensions.width} height={dimensions.height} />
          </div>
          {analyzing ? (
            <ProgressBar percent={progress} label="영상 분석 중..." />
          ) : (
            <button
              onClick={handleAnalyze}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              분석 시작
            </button>
          )}
        </>
      )}
    </div>
  );
}
