import type { CameraAngle, LandmarkSnapshot, FormIssue, AsymmetryDetails } from '../../types/analysis';
import { analyzeFrontBack } from './rule-sets/front-back';
import { analyzeSide, resetSideState } from './rule-sets/side';
import { computeFormScore } from './rule-sets/shared';
import { calculateAsymmetry } from './angle-calculator';

export class FormAnalyzer {
  private angle: CameraAngle;
  // 높이 비대칭 (절대값)
  private shoulderAsymSamples: number[] = [];
  private elbowAsymSamples: number[] = [];
  private hipAsymSamples: number[] = [];
  // 높이 비대칭 (부호 포함: 양수 = 오른쪽 낮음)
  private shoulderBiasSamples: number[] = [];
  private elbowBiasSamples: number[] = [];
  private hipBiasSamples: number[] = [];
  // 다리 벌어짐 (골반 너비 대비 %)
  private kneeGapSamples: number[] = [];
  // 팔꿈치 너비 비대칭 (절대값 + 부호)
  private elbowWidthSamples: number[] = [];
  private elbowWidthBiasSamples: number[] = [];

  constructor(angle: CameraAngle) {
    this.angle = angle;
    resetSideState();
  }

  analyze(landmarks: LandmarkSnapshot): FormIssue[] {
    // 높이 비대칭
    const shoulderAsym = calculateAsymmetry(landmarks.shoulderLeft.y, landmarks.shoulderRight.y);
    const elbowAsym = calculateAsymmetry(landmarks.elbowLeft.y, landmarks.elbowRight.y);
    const hipAsym = calculateAsymmetry(landmarks.hipLeft.y, landmarks.hipRight.y);

    this.shoulderAsymSamples.push(Math.abs(shoulderAsym));
    this.elbowAsymSamples.push(Math.abs(elbowAsym));
    this.hipAsymSamples.push(Math.abs(hipAsym));
    this.shoulderBiasSamples.push(shoulderAsym);
    this.elbowBiasSamples.push(elbowAsym);
    this.hipBiasSamples.push(hipAsym);

    // 다리 벌어짐 (골반 너비 대비 %)
    const hipWidth = Math.abs(landmarks.hipLeft.x - landmarks.hipRight.x);
    const kneeGapX = Math.abs(landmarks.kneeLeft.x - landmarks.kneeRight.x);
    const kneeGapRatio = hipWidth > 0.01 ? (kneeGapX / hipWidth) * 100 : 0;
    this.kneeGapSamples.push(kneeGapRatio);

    // 팔꿈치 너비 대칭 (등 중심 기준 좌우 간격 차이)
    const centerX = (landmarks.shoulderLeft.x + landmarks.shoulderRight.x) / 2;
    const leftSpread = Math.abs(centerX - landmarks.elbowLeft.x);
    const rightSpread = Math.abs(landmarks.elbowRight.x - centerX);
    const avgSpread = (leftSpread + rightSpread) / 2;
    const elbowWidthAsym = avgSpread > 0.005
      ? ((rightSpread - leftSpread) / avgSpread) * 100
      : 0;
    this.elbowWidthSamples.push(Math.abs(elbowWidthAsym));
    this.elbowWidthBiasSamples.push(elbowWidthAsym);

    switch (this.angle) {
      case 'front':
      case 'back':
        return analyzeFrontBack(landmarks);
      case 'side':
        return analyzeSide(landmarks);
    }
  }

  computeFormScore(issues: FormIssue[]): number {
    return computeFormScore(issues);
  }

  /**
   * 전체 세션의 밸런스 점수 계산 (0~100)
   * 5개 항목 가중 평균으로 산출
   */
  computeBalanceScore(): number {
    if (this.shoulderAsymSamples.length === 0) return 100;

    const avgShoulder = average(this.shoulderAsymSamples);
    const avgElbow = average(this.elbowAsymSamples);
    const avgHip = average(this.hipAsymSamples);
    const avgElbowWidth = average(this.elbowWidthSamples);
    // 골반 대비 초과분만 감점 (110% → 1점, 100% 이하 → 0점)
    const avgKneeGap = Math.max(0, average(this.kneeGapSamples) - 100) / 10;

    // 어깨 20%, 팔꿈치 높이 15%, 골반 10%, 팔꿈치 너비 25%, 다리 밀착 30%
    const weightedAsym =
      avgShoulder * 0.20 +
      avgElbow * 0.15 +
      avgHip * 0.10 +
      avgElbowWidth * 0.25 +
      avgKneeGap * 0.30;

    // 비대칭 0% → 100점, 10%+ → 0점
    return Math.max(0, Math.round(100 - weightedAsym * 10));
  }

  /**
   * 부위별 비대칭 상세 데이터 반환 (리포트용)
   */
  getAsymmetryDetails(): AsymmetryDetails {
    return {
      shoulder: average(this.shoulderAsymSamples),
      elbow: average(this.elbowAsymSamples),
      hip: average(this.hipAsymSamples),
      shoulderBias: average(this.shoulderBiasSamples),
      elbowBias: average(this.elbowBiasSamples),
      hipBias: average(this.hipBiasSamples),
      kneeGap: average(this.kneeGapSamples),
      elbowWidth: average(this.elbowWidthSamples),
      elbowWidthBias: average(this.elbowWidthBiasSamples),
    };
  }
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
