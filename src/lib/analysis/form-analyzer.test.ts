import { describe, it, expect } from 'vitest';
import { FormAnalyzer } from './form-analyzer';
import type { LandmarkSnapshot, Point3D, FormIssue } from '../../types/analysis';

const p = (x: number, y: number, z = 0): Point3D => ({
  x, y, z, visibility: 1,
});

function symmetricLandmarks(): LandmarkSnapshot {
  return {
    shoulderLeft: p(0.4, 0.3),
    shoulderRight: p(0.6, 0.3),
    elbowLeft: p(0.35, 0.5),
    elbowRight: p(0.65, 0.5),
    wristLeft: p(0.35, 0.2),
    wristRight: p(0.65, 0.2),
    hipLeft: p(0.45, 0.7),
    hipRight: p(0.55, 0.7),
    kneeLeft: p(0.45, 0.9),
    kneeRight: p(0.55, 0.9),
    nose: p(0.5, 0.15),
  };
}

function asymmetricLandmarks(): LandmarkSnapshot {
  return {
    ...symmetricLandmarks(),
    shoulderLeft: p(0.4, 0.35),
    shoulderRight: p(0.6, 0.25),
  };
}

describe('FormAnalyzer — front/back', () => {
  it('should return no issues for symmetric form', () => {
    const analyzer = new FormAnalyzer('front');
    const issues = analyzer.analyze(symmetricLandmarks());
    const asymmetryIssues = issues.filter((i) => i.type === 'asymmetry');
    expect(asymmetryIssues).toHaveLength(0);
  });

  it('should detect shoulder asymmetry', () => {
    const analyzer = new FormAnalyzer('back');
    const issues = analyzer.analyze(asymmetricLandmarks());
    const shoulderIssue = issues.find(
      (i) => i.type === 'asymmetry' && i.detail.includes('shoulder'),
    );
    expect(shoulderIssue).toBeDefined();
    expect(shoulderIssue!.severity).toBe('medium');
  });
});

describe('FormAnalyzer — side', () => {
  it('should detect body swing', () => {
    const analyzer = new FormAnalyzer('side');
    const landmarks = symmetricLandmarks();
    analyzer.analyze(landmarks);
    const swung = {
      ...landmarks,
      hipLeft: p(0.6, 0.7),
      hipRight: p(0.7, 0.7),
    };
    const issues = analyzer.analyze(swung);
    const swingIssue = issues.find((i) => i.type === 'body_swing');
    expect(swingIssue).toBeDefined();
  });
});

describe('FormAnalyzer — shared', () => {
  it('should compute form score from issues', () => {
    const analyzer = new FormAnalyzer('front');
    const score = analyzer.computeFormScore([]);
    expect(score).toBe(100);
  });

  it('should deduct points for issues by severity', () => {
    const analyzer = new FormAnalyzer('front');
    const issues: FormIssue[] = [
      { type: 'asymmetry', severity: 'medium', detail: '', values: {} },
      { type: 'body_swing', severity: 'low', detail: '', values: {} },
    ];
    const score = analyzer.computeFormScore(issues);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThan(0);
  });
});
