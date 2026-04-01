import type { FormIssue, Severity } from '../../../types/analysis';

const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  low: 5,
  medium: 15,
  high: 25,
};

export function computeFormScore(issues: FormIssue[]): number {
  const total = issues.reduce(
    (sum, issue) => sum + SEVERITY_DEDUCTIONS[issue.severity],
    0,
  );
  return Math.max(0, 100 - total);
}
