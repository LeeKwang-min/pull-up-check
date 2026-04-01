import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { WorkerInMessage, WorkerOutMessage } from '../types/worker-messages';
import type { LandmarkSnapshot, CameraAngle } from '../types/analysis';
import { calculateAngle } from '../lib/analysis/angle-calculator';
import { RepCounter } from '../lib/analysis/rep-counter';
import { FormAnalyzer } from '../lib/analysis/form-analyzer';

let poseLandmarker: PoseLandmarker | null = null;
let repCounter: RepCounter | null = null;
let formAnalyzer: FormAnalyzer | null = null;

function post(msg: WorkerOutMessage): void {
  self.postMessage(msg);
}

function extractLandmarks(rawLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>): LandmarkSnapshot {
  const lm = (index: number) => ({
    x: rawLandmarks[index].x,
    y: rawLandmarks[index].y,
    z: rawLandmarks[index].z,
    visibility: rawLandmarks[index].visibility ?? 0,
  });

  return {
    shoulderLeft: lm(11),
    shoulderRight: lm(12),
    elbowLeft: lm(13),
    elbowRight: lm(14),
    wristLeft: lm(15),
    wristRight: lm(16),
    hipLeft: lm(23),
    hipRight: lm(24),
    kneeLeft: lm(25),
    kneeRight: lm(26),
    nose: lm(0),
  };
}

async function initialize(angle: CameraAngle, modelPath: string): Promise<void> {
  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    repCounter = new RepCounter();
    formAnalyzer = new FormAnalyzer(angle);

    post({ type: 'ready' });
  } catch (error) {
    post({ type: 'error', message: `Init failed: ${error}` });
  }
}

function processFrame(imageData: ImageBitmap, timestamp: number): void {
  if (!poseLandmarker || !repCounter || !formAnalyzer) return;

  const result = poseLandmarker.detectForVideo(imageData, timestamp);

  if (!result.landmarks || result.landmarks.length === 0) return;

  const landmarks = extractLandmarks(result.landmarks[0]);
  post({ type: 'landmarks', data: landmarks, timestamp });

  const leftAngle = calculateAngle(
    landmarks.shoulderLeft,
    landmarks.elbowLeft,
    landmarks.wristLeft,
  );
  const rightAngle = calculateAngle(
    landmarks.shoulderRight,
    landmarks.elbowRight,
    landmarks.wristRight,
  );
  const avgAngle = (leftAngle + rightAngle) / 2;

  const repCompleted = repCounter.update(avgAngle, timestamp);

  const issues = formAnalyzer.analyze(landmarks);

  for (const issue of issues) {
    if (issue.severity === 'high' || issue.severity === 'medium') {
      post({ type: 'form-alert', issue });
    }
  }

  if (repCompleted) {
    const formScore = formAnalyzer.computeFormScore(issues);
    post({
      type: 'rep',
      count: repCounter.count,
      formScore,
      details: issues,
    });
  }
}

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'init':
      initialize(msg.config.angle, msg.config.modelPath);
      break;
    case 'frame':
      processFrame(msg.imageData, msg.timestamp);
      break;
    case 'start-set':
      repCounter?.reset();
      break;
    case 'end-set':
      break;
    case 'stop':
      poseLandmarker?.close();
      poseLandmarker = null;
      break;
  }
};
