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
    const side = shoulderAsym > 0 ? 'left' : 'right';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(shoulderAsym, 5, 15),
      detail: `${side} shoulder is ${Math.abs(shoulderAsym).toFixed(1)}% lower`,
      values: { shoulderAsymmetry: shoulderAsym },
    });
  }

  const elbowAsym = calculateAsymmetry(
    landmarks.elbowLeft.y,
    landmarks.elbowRight.y,
  );
  if (Math.abs(elbowAsym) > ELBOW_THRESHOLD) {
    const side = elbowAsym > 0 ? 'left' : 'right';
    issues.push({
      type: 'asymmetry',
      severity: classifySeverity(elbowAsym, 8, 20),
      detail: `${side} elbow is ${Math.abs(elbowAsym).toFixed(1)}% lower`,
      values: { elbowAsymmetry: elbowAsym },
    });
  }

  return issues;
}
