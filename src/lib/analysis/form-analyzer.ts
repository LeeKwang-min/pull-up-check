import type { CameraAngle, LandmarkSnapshot, FormIssue } from '../../types/analysis';
import { analyzeFrontBack } from './rule-sets/front-back';
import { analyzeSide, resetSideState } from './rule-sets/side';
import { computeFormScore } from './rule-sets/shared';
import { calculateAsymmetry } from './angle-calculator';

export class FormAnalyzer {
  private angle: CameraAngle;
  private shoulderAsymSamples: number[] = [];
  private elbowAsymSamples: number[] = [];
  private hipAsymSamples: number[] = [];

  constructor(angle: CameraAngle) {
    this.angle = angle;
    resetSideState();
  }

  analyze(landmarks: LandmarkSnapshot): FormIssue[] {
    // 매 프레임마다 비대칭 데이터 수집 (임계값 무관)
    this.shoulderAsymSamples.push(
      Math.abs(calculateAsymmetry(landmarks.shoulderLeft.y, landmarks.shoulderRight.y)),
    );
    this.elbowAsymSamples.push(
      Math.abs(calculateAsymmetry(landmarks.elbowLeft.y, landmarks.elbowRight.y)),
    );
    this.hipAsymSamples.push(
      Math.abs(calculateAsymmetry(landmarks.hipLeft.y, landmarks.hipRight.y)),
    );

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
   * 모든 프레임의 좌우 비대칭 평균으로 산출
   */
  computeBalanceScore(): number {
    if (this.shoulderAsymSamples.length === 0) return 100;

    const avgShoulder = average(this.shoulderAsymSamples);
    const avgElbow = average(this.elbowAsymSamples);
    const avgHip = average(this.hipAsymSamples);

    // 어깨 비중 50%, 팔꿈치 30%, 엉덩이 20%
    const weightedAsym = avgShoulder * 0.5 + avgElbow * 0.3 + avgHip * 0.2;

    // 비대칭 0% → 100점, 10%+ → 0점 (더 민감하게)
    return Math.max(0, Math.round(100 - weightedAsym * 10));
  }

  /**
   * 부위별 비대칭 상세 데이터 반환 (리포트용)
   */
  getAsymmetryDetails(): { shoulder: number; elbow: number; hip: number } {
    return {
      shoulder: average(this.shoulderAsymSamples),
      elbow: average(this.elbowAsymSamples),
      hip: average(this.hipAsymSamples),
    };
  }
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
