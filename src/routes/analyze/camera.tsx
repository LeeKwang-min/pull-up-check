import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useRef } from 'react';
import { CameraView } from '../../components/camera/CameraView';
import { CameraControls } from '../../components/camera/CameraControls';
import { LiveStats } from '../../components/analysis/LiveStats';
import { useAnalysisStore } from '../../stores/analysis-store';
import { PoseWorkerClient } from '../../lib/worker-client';
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
  const workerRef = useRef<PoseWorkerClient | null>(null);

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

  const handleStartStop = useCallback(() => {
    if (isAnalyzing) {
      workerRef.current?.stop();
      workerRef.current = null;
      stopAnalysis();
    } else {
      const worker = new Worker(
        new URL('../../workers/pose-worker.ts', import.meta.url),
        { type: 'module' },
      );
      const client = new PoseWorkerClient(worker);

      client.onReady = () => startAnalysis();
      client.onLandmarks = (data) => updateLandmarks(data);
      client.onRep = (count, formScore, details) => addRep(formScore, details);
      client.onFormAlert = (issue) => addAlert(issue);

      client.init({
        angle,
        modelPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
      });

      workerRef.current = client;
    }
  }, [isAnalyzing, angle, startAnalysis, stopAnalysis, addRep, addAlert, updateLandmarks]);

  const handleFrame = useCallback(
    (bitmap: ImageBitmap, timestamp: number) => {
      workerRef.current?.sendFrame(bitmap, timestamp);
    },
    [],
  );

  const handleNextSet = useCallback(() => {
    nextSet();
    workerRef.current?.startSet();
  }, [nextSet]);

  const handleFinish = useCallback(async () => {
    if (repCount > 0) {
      nextSet();
    }
    workerRef.current?.stop();
    workerRef.current = null;

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
      balanceScore: 0,
      totalReps: allSets.reduce((s, set) => s + set.reps.length, 0),
      duration: 0,
    });

    reset();
    navigate({ to: '/result/$id', params: { id: sessionId } });
  }, [angle, repCount, nextSet, reset, navigate]);

  return (
    <div className="py-4 space-y-4">
      <CameraView onFrame={handleFrame} isActive={isAnalyzing} landmarks={landmarks} />
      <LiveStats repCount={repCount} currentSet={currentSet} alerts={alerts} />
      <CameraControls
        isAnalyzing={isAnalyzing}
        onStartStop={handleStartStop}
        onNextSet={handleNextSet}
        onFinish={handleFinish}
      />
    </div>
  );
}
