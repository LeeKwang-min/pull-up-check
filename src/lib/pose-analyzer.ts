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
  private angle: CameraAngle;
  private lastTimestamp = -1;
  private activated = false;

  constructor(angle: CameraAngle, callbacks: PoseAnalyzerCallbacks) {
    this.angle = angle;
    this.repCounter = new RepCounter();
    this.formAnalyzer = new FormAnalyzer(angle);
    this.callbacks = callbacks;
  }

  /** Pre-check 후 분석 시작 전 내부 상태를 초기화 */
  reset(): void {
    this.repCounter = new RepCounter();
    this.formAnalyzer = new FormAnalyzer(this.angle);
    this.activated = false;
    this.lastTimestamp = -1;
  }

  async init(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
    );

    const opts = {
      runningMode: 'VIDEO' as const,
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };

    try {
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        ...opts,
      });
      this.callbacks.onReady?.();
    } catch {
      try {
        this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          ...opts,
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

    // 매달린 자세(extended) 감지 후부터 폼 분석 시작
    if (!this.activated && this.repCounter.phase !== 'idle') {
      this.activated = true;
    }
    const issues = this.activated
      ? this.formAnalyzer.analyze(landmarks, this.repCounter.phase)
      : [];

    // 불완전 ROM 실시간 경고
    if (this.repCounter.incompleteRomDetected) {
      const romIssue: import('../types/analysis').FormIssue = {
        type: 'incomplete_rom',
        severity: 'high',
        detail: '불완전 ROM: 팔꿈치가 90° 이하로 굽혀지지 않았습니다',
        values: {},
      };
      this.callbacks.onFormAlert?.(romIssue);
      this.repCounter.incompleteRomDetected = false;
    }

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
      // Chin-over-bar 체크
      const chinIssue = this.formAnalyzer.getChinOverBarIssue();
      if (chinIssue) issues.push(chinIssue);

      // 하강 속도 체크
      if (this.repCounter.eccentricTooFast) {
        issues.push({
          type: 'fast_eccentric',
          severity: 'medium',
          detail: `하강이 너무 빠릅니다 (${(this.repCounter.lastEccentricMs / 1000).toFixed(1)}초)`,
          values: { eccentricMs: this.repCounter.lastEccentricMs },
        });
        this.repCounter.eccentricTooFast = false;
      }

      this.formAnalyzer.resetRepState();

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
