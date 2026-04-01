import type { LandmarkSnapshot, FormIssue } from '../../../types/analysis';

const SWING_THRESHOLD = 0.08;

let baselineHipX: number | null = null;

export function resetSideState(): void {
  baselineHipX = null;
}

export function analyzeSide(landmarks: LandmarkSnapshot): FormIssue[] {
  const issues: FormIssue[] = [];

  const hipMidX = (landmarks.hipLeft.x + landmarks.hipRight.x) / 2;

  if (baselineHipX === null) {
    baselineHipX = hipMidX;
    return issues;
  }

  const swing = Math.abs(hipMidX - baselineHipX);
  if (swing > SWING_THRESHOLD) {
    issues.push({
      type: 'body_swing',
      severity: swing > 0.15 ? 'high' : swing > 0.1 ? 'medium' : 'low',
      detail: `몸통 흔들림 감지: ${(swing * 100).toFixed(1)}% 변위`,
      values: { swingAmount: swing },
    });
  }

  const hipMidY = (landmarks.hipLeft.y + landmarks.hipRight.y) / 2;
  const kneeMidY = (landmarks.kneeLeft.y + landmarks.kneeRight.y) / 2;
  const hipKneeAngleProxy = Math.abs(hipMidY - kneeMidY);

  if (hipKneeAngleProxy < 0.1) {
    issues.push({
      type: 'kipping',
      severity: 'medium',
      detail: '키핑 의심: 무릎이 엉덩이 쪽으로 올라감',
      values: { hipKneeDistance: hipKneeAngleProxy },
    });
  }

  return issues;
}
