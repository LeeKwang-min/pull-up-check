import type { CameraAngle, LandmarkSnapshot, FormIssue, AsymmetryDetails } from '../../types/analysis';
import { analyzeFrontBack } from './rule-sets/front-back';
import { analyzeSide, resetSideState } from './rule-sets/side';
import { computeFormScore } from './rule-sets/shared';
import { calculateAsymmetry } from './angle-calculator';

/** O(1) memory running average accumulator */
class RunningAvg {
  private sum = 0;
  private count = 0;
  push(v: number) { this.sum += v; this.count++; }
  get avg() { return this.count > 0 ? this.sum / this.count : 0; }
  get empty() { return this.count === 0; }
}

export class FormAnalyzer {
  private angle: CameraAngle;

  // ── 정면/후면: 좌우 비대칭 (running averages) ──
  private shoulderAsym = new RunningAvg();
  private elbowAsym = new RunningAvg();
  private hipAsym = new RunningAvg();
  private shoulderBias = new RunningAvg();
  private elbowBias = new RunningAvg();
  private hipBias = new RunningAvg();
  private kneeGap = new RunningAvg();
  private elbowWidth = new RunningAvg();
  private elbowWidthBias = new RunningAvg();

  // ── 측면: 안정성 지표 ──
  private sideFrameCount = 0;
  private swingFrames = 0;
  private swingMagnitudeSum = 0;
  private kippingFrames = 0;

  constructor(angle: CameraAngle) {
    this.angle = angle;
    resetSideState();
  }

  analyze(landmarks: LandmarkSnapshot): FormIssue[] {
    if (this.angle === 'front' || this.angle === 'back') {
      return this.analyzeFrontBackFrame(landmarks);
    }
    return this.analyzeSideFrame(landmarks);
  }

  private analyzeFrontBackFrame(landmarks: LandmarkSnapshot): FormIssue[] {
    const shoulderA = calculateAsymmetry(landmarks.shoulderLeft.y, landmarks.shoulderRight.y);
    const elbowA = calculateAsymmetry(landmarks.elbowLeft.y, landmarks.elbowRight.y);
    const hipA = calculateAsymmetry(landmarks.hipLeft.y, landmarks.hipRight.y);

    this.shoulderAsym.push(Math.abs(shoulderA));
    this.elbowAsym.push(Math.abs(elbowA));
    this.hipAsym.push(Math.abs(hipA));
    this.shoulderBias.push(shoulderA);
    this.elbowBias.push(elbowA);
    this.hipBias.push(hipA);

    const hipWidth = Math.abs(landmarks.hipLeft.x - landmarks.hipRight.x);
    const kneeGapX = Math.abs(landmarks.kneeLeft.x - landmarks.kneeRight.x);
    this.kneeGap.push(hipWidth > 0.01 ? (kneeGapX / hipWidth) * 100 : 0);

    const centerX = (landmarks.shoulderLeft.x + landmarks.shoulderRight.x) / 2;
    const leftSpread = Math.abs(centerX - landmarks.elbowLeft.x);
    const rightSpread = Math.abs(landmarks.elbowRight.x - centerX);
    const avgSpread = (leftSpread + rightSpread) / 2;
    const elbowWidthA = avgSpread > 0.005
      ? ((rightSpread - leftSpread) / avgSpread) * 100
      : 0;
    this.elbowWidth.push(Math.abs(elbowWidthA));
    this.elbowWidthBias.push(elbowWidthA);

    return analyzeFrontBack(landmarks);
  }

  private analyzeSideFrame(landmarks: LandmarkSnapshot): FormIssue[] {
    this.sideFrameCount++;
    const issues = analyzeSide(landmarks);

    for (const issue of issues) {
      if (issue.type === 'body_swing') {
        this.swingFrames++;
        this.swingMagnitudeSum += issue.values.swingAmount ?? 0;
      }
      if (issue.type === 'kipping') {
        this.kippingFrames++;
      }
    }

    return issues;
  }

  computeFormScore(issues: FormIssue[]): number {
    return computeFormScore(issues);
  }

  computeBalanceScore(): number {
    if (this.angle === 'side') {
      return this.computeSideStabilityScore();
    }
    return this.computeFrontBackBalanceScore();
  }

  private computeFrontBackBalanceScore(): number {
    if (this.shoulderAsym.empty) return 100;

    const avgKneeGap = Math.max(0, this.kneeGap.avg - 140) / 10;
    const weightedAsym =
      this.shoulderAsym.avg * 0.20 +
      this.elbowAsym.avg * 0.15 +
      this.hipAsym.avg * 0.10 +
      this.elbowWidth.avg * 0.25 +
      avgKneeGap * 0.30;

    return Math.max(0, Math.round(100 - weightedAsym * 10));
  }

  private computeSideStabilityScore(): number {
    if (this.sideFrameCount === 0) return 100;
    const penalty =
      (this.swingFrames / this.sideFrameCount) * 60 +
      (this.kippingFrames / this.sideFrameCount) * 40;
    return Math.max(0, Math.round(100 - penalty));
  }

  getAsymmetryDetails(): AsymmetryDetails {
    if (this.angle === 'side') {
      return {
        shoulder: 0, elbow: 0, hip: 0,
        shoulderBias: 0, elbowBias: 0, hipBias: 0,
        kneeGap: 0, elbowWidth: 0, elbowWidthBias: 0,
      };
    }
    return {
      shoulder: this.shoulderAsym.avg,
      elbow: this.elbowAsym.avg,
      hip: this.hipAsym.avg,
      shoulderBias: this.shoulderBias.avg,
      elbowBias: this.elbowBias.avg,
      hipBias: this.hipBias.avg,
      kneeGap: this.kneeGap.avg,
      elbowWidth: this.elbowWidth.avg,
      elbowWidthBias: this.elbowWidthBias.avg,
    };
  }

  getSideDetails() {
    if (this.sideFrameCount === 0) return null;
    return {
      swingRate: this.swingFrames / this.sideFrameCount,
      avgSwingMagnitude: this.swingFrames > 0 ? this.swingMagnitudeSum / this.swingFrames : 0,
      kippingRate: this.kippingFrames / this.sideFrameCount,
      totalFrames: this.sideFrameCount,
    };
  }
}
