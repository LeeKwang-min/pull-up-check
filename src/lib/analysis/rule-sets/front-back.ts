import type { LandmarkSnapshot, FormIssue, Severity } from '../../../types/analysis';
import { calculateAsymmetry } from '../angle-calculator';

// 임계값을 낮춰서 미세한 불균형도 감지
const SHOULDER_THRESHOLD = 3;
const ELBOW_THRESHOLD = 4;
const HIP_THRESHOLD = 3;
const KNEE_GAP_THRESHOLD = 140;    // 골반 너비 대비 140% 이상 벌어지면 감지 (11자 자연 늘어짐 허용)
const ELBOW_WIDTH_THRESHOLD = 10;  // 팔꿈치 너비 좌우 10% 이상 차이

function classifySeverity(value: number, low: number, medium: number, high: number): Severity {
  const abs = Math.abs(value);
  if (abs >= high) return 'high';
  if (abs >= medium) return 'medium';
  if (abs >= low) return 'low';
  return 'low';
}

export function analyzeFrontBack(landmarks: LandmarkSnapshot): FormIssue[] {
  const issues: FormIssue[] = [];

  // 어깨 비대칭
  const shoulderAsym = calculateAsymmetry(
    landmarks.shoulderLeft.y,
    landmarks.shoulderRight.y,
  );
  if (Math.abs(shoulderAsym) > SHOULDER_THRESHOLD) {
    const sideKo = shoulderAsym > 0 ? '왼쪽' : '오른쪽';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(Math.abs(shoulderAsym), 3, 8, 15),
      detail: `${sideKo} 어깨가 ${Math.abs(shoulderAsym).toFixed(1)}% 낮습니다`,
      values: { shoulderAsymmetry: shoulderAsym, leftSide: shoulderAsym > 0 ? 1 : 0 },
    });
  }

  // 팔꿈치 비대칭
  const elbowAsym = calculateAsymmetry(
    landmarks.elbowLeft.y,
    landmarks.elbowRight.y,
  );
  if (Math.abs(elbowAsym) > ELBOW_THRESHOLD) {
    const elbowSideKo = elbowAsym > 0 ? '왼쪽' : '오른쪽';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(Math.abs(elbowAsym), 4, 10, 20),
      detail: `${elbowSideKo} 팔꿈치가 ${Math.abs(elbowAsym).toFixed(1)}% 낮습니다`,
      values: { elbowAsymmetry: elbowAsym },
    });
  }

  // 엉덩이 비대칭 (몸통 기울기 감지)
  const hipAsym = calculateAsymmetry(
    landmarks.hipLeft.y,
    landmarks.hipRight.y,
  );
  if (Math.abs(hipAsym) > HIP_THRESHOLD) {
    const hipSideKo = hipAsym > 0 ? '왼쪽' : '오른쪽';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(Math.abs(hipAsym), 3, 8, 15),
      detail: `몸통이 ${hipSideKo}으로 ${Math.abs(hipAsym).toFixed(1)}% 기울어져 있습니다`,
      values: { hipAsymmetry: hipAsym },
    });
  }

  // 손목 높이 차이 (그립 비대칭)
  const wristAsym = calculateAsymmetry(
    landmarks.wristLeft.y,
    landmarks.wristRight.y,
  );
  if (Math.abs(wristAsym) > 5) {
    const wristSideKo = wristAsym > 0 ? '왼쪽' : '오른쪽';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(Math.abs(wristAsym), 5, 12, 20),
      detail: `${wristSideKo} 손이 ${Math.abs(wristAsym).toFixed(1)}% 더 높이 올라갑니다`,
      values: { wristAsymmetry: wristAsym },
    });
  }

  // 다리 반동 체크 (골반 너비 기준 — 골반보다 크게 벌어지면 반동 사용)
  // 자연스럽게 11자로 늘어진 다리는 허용, 골반보다 넓게 벌린 경우만 감지
  const hipWidth = Math.abs(landmarks.hipLeft.x - landmarks.hipRight.x);
  const kneeGapX = Math.abs(landmarks.kneeLeft.x - landmarks.kneeRight.x);
  const kneeGapRatio = hipWidth > 0.01 ? (kneeGapX / hipWidth) * 100 : 0;

  if (kneeGapRatio > KNEE_GAP_THRESHOLD) {
    issues.push({
      type: 'leg_spread',
      severity: classifySeverity(kneeGapRatio, 140, 170, 200),
      detail: `다리가 골반 너비보다 ${(kneeGapRatio - 100).toFixed(0)}% 벌어져 반동이 감지됩니다`,
      values: { kneeGapRatio },
    });
  }

  // 팔꿈치 너비 대칭 체크 (등과 양팔꿈치 간격이 동일해야 함)
  const centerX = (landmarks.shoulderLeft.x + landmarks.shoulderRight.x) / 2;
  const leftElbowSpread = Math.abs(centerX - landmarks.elbowLeft.x);
  const rightElbowSpread = Math.abs(landmarks.elbowRight.x - centerX);
  const avgSpread = (leftElbowSpread + rightElbowSpread) / 2;
  const elbowWidthAsym = avgSpread > 0.005
    ? ((rightElbowSpread - leftElbowSpread) / avgSpread) * 100
    : 0;

  if (Math.abs(elbowWidthAsym) > ELBOW_WIDTH_THRESHOLD) {
    const side = elbowWidthAsym > 0 ? '오른쪽' : '왼쪽';
    issues.push({
      type: 'elbow_width',
      severity: classifySeverity(Math.abs(elbowWidthAsym), 10, 25, 40),
      detail: `${side} 팔꿈치가 ${Math.abs(elbowWidthAsym).toFixed(1)}% 더 벌어져 있습니다`,
      values: { elbowWidthAsym },
    });
  }

  return issues;
}
