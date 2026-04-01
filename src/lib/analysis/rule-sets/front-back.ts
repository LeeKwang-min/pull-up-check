import type { LandmarkSnapshot, FormIssue, Severity } from '../../../types/analysis';
import { calculateAsymmetry } from '../angle-calculator';

const SHOULDER_THRESHOLD = 5;
const ELBOW_THRESHOLD = 8;

function classifySeverity(value: number, medium: number, high: number): Severity {
  const abs = Math.abs(value);
  if (abs >= high) return 'high';
  if (abs >= medium) return 'medium';
  return 'low';
}

export function analyzeFrontBack(landmarks: LandmarkSnapshot): FormIssue[] {
  const issues: FormIssue[] = [];

  const shoulderAsym = calculateAsymmetry(
    landmarks.shoulderLeft.y,
    landmarks.shoulderRight.y,
  );
  if (Math.abs(shoulderAsym) > SHOULDER_THRESHOLD) {
    const sideKo = shoulderAsym > 0 ? '왼쪽' : '오른쪽';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(shoulderAsym, 5, 15),
      detail: `${sideKo} 어깨가 ${Math.abs(shoulderAsym).toFixed(1)}% 낮습니다`,
      values: { shoulderAsymmetry: shoulderAsym, leftSide: shoulderAsym > 0 ? 1 : 0 },
    });
  }

  const elbowAsym = calculateAsymmetry(
    landmarks.elbowLeft.y,
    landmarks.elbowRight.y,
  );
  if (Math.abs(elbowAsym) > ELBOW_THRESHOLD) {
    const elbowSideKo = elbowAsym > 0 ? '왼쪽' : '오른쪽';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(elbowAsym, 8, 20),
      detail: `${elbowSideKo} 팔꿈치가 ${Math.abs(elbowAsym).toFixed(1)}% 낮습니다`,
      values: { elbowAsymmetry: elbowAsym },
    });
  }

  return issues;
}
