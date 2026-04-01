import type { LandmarkSnapshot, FormIssue, Severity } from '../../../types/analysis';
import { calculateAsymmetry } from '../angle-calculator';

// 임계값을 낮춰서 미세한 불균형도 감지
const SHOULDER_THRESHOLD = 3;
const ELBOW_THRESHOLD = 4;
const HIP_THRESHOLD = 3;

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

  return issues;
}
