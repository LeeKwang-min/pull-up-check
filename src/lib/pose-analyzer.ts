import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { CameraAngle, LandmarkSnapshot, FormIssue } from '../types/analysis';
import { calculateAngle } from './analysis/angle-calculator';
import { RepCounter } from './analysis/rep-counter';
import { FormAnalyzer } from './analysis/form-analyzer';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

export interface RepResult {
  count: number;
  formScore: number;
  tempo: number;
  rom: number;
  details: FormIssue[];
}

export interface PoseAnalyzerCallbacks {
  onReady?: () => void;
  onLandmarks?: (data: LandmarkSnapshot, timestamp: number) => void;
  onRep?: (result: RepResult) => void;
  onFormAlert?: (issue: FormIssue) => void;
  onError?: (message: string) => void;
}

export class PoseAnalyzer {
  private poseLandmarker: PoseLandmarker | null = null;
  private repCounter: RepCounter;
  private formAnalyzer: FormAnalyzer;
  private callbacks: PoseAnalyzerCallbacks;
  private lastTimestamp = -1;

  constructor(angle: CameraAngle, callbacks: PoseAnalyzerCallbacks) {
    this.repCounter = new RepCounter();
    this.formAnalyzer = new FormAnalyzer(angle);
    this.callbacks = callbacks;
  }

  async init(): Promise<void> {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
      );

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.callbacks.onReady?.();
    } catch (error) {
      // GPU 실패 시 CPU로 재시도
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );

        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        this.callbacks.onReady?.();
      } catch (cpuError) {
        this.callbacks.onError?.(`MediaPipe 초기화 실패: ${cpuError}`);
      }
    }
  }

  processFrame(video: HTMLVideoElement, timestamp: number): void {
    if (!this.poseLandmarker) return;

    // MediaPipe는 증가하는 타임스탬프를 요구
    const ts = Math.max(timestamp, this.lastTimestamp + 1);
    this.lastTimestamp = ts;

    const result = this.poseLandmarker.detectForVideo(video, ts);

    if (!result.landmarks || result.landmarks.length === 0) return;

    const raw = result.landmarks[0];
    const landmarks = this.extractLandmarks(raw);
    this.callbacks.onLandmarks?.(landmarks, ts);

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

    const prevPhase = this.repCounter.phase;
    const repCompleted = this.repCounter.update(leftAngle, rightAngle, ts);
    const issues = this.formAnalyzer.analyze(landmarks);

    // 디버그 로깅
    if (repCompleted || prevPhase !== this.repCounter.phase) {
      const avg = (leftAngle + rightAngle) / 2;
      console.log(
        `[PoseDebug] t=${(ts / 1000).toFixed(1)}s | avg=${avg.toFixed(1)}° | L=${leftAngle.toFixed(1)}° R=${rightAngle.toFixed(1)}° | ${prevPhase}→${this.repCounter.phase}${repCompleted ? ` | REP #${this.repCounter.count}` : ''}`,
      );
    }

    for (const issue of issues) {
      if (issue.severity === 'high' || issue.severity === 'medium') {
        this.callbacks.onFormAlert?.(issue);
      }
    }

    if (repCompleted) {
      const formScore = this.formAnalyzer.computeFormScore(issues);
      this.callbacks.onRep?.({
        count: this.repCounter.count,
        formScore,
        tempo: this.repCounter.lastTempo,
        rom: this.repCounter.lastRom,
        details: issues,
      });
    }
  }

  resetSet(): void {
    this.repCounter.reset();
  }

  getBalanceScore(): number {
    return this.formAnalyzer.computeBalanceScore();
  }

  getAsymmetryDetails(): import('../types/analysis').AsymmetryDetails {
    return this.formAnalyzer.getAsymmetryDetails();
  }

  destroy(): void {
    this.poseLandmarker?.close();
    this.poseLandmarker = null;
  }

  private extractLandmarks(
    raw: Array<{ x: number; y: number; z: number; visibility?: number }>,
  ): LandmarkSnapshot {
    const lm = (index: number) => ({
      x: raw[index].x,
      y: raw[index].y,
      z: raw[index].z,
      visibility: raw[index].visibility ?? 0,
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
}
