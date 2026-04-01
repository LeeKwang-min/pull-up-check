import { describe, it, expect } from 'vitest';
import type {
  Point3D,
  LandmarkSnapshot,
  FormIssue,
  RepData,
  SetData,
  Session,
  CameraAngle,
  InputMode,
} from './analysis';

describe('Analysis types', () => {
  it('should create a valid Session object', () => {
    const session: Session = {
      id: 'test-uuid',
      date: new Date('2026-04-01'),
      angle: 'back',
      inputMode: 'camera',
      sets: [
        {
          setNumber: 1,
          reps: [
            {
              repNumber: 1,
              formScore: 85,
              tempo: 2400,
              rom: 92,
              landmarks: createMockLandmarks(),
              issues: [],
            },
          ],
          averageFormScore: 85,
          formBreakdownRep: null,
        },
      ],
      overallScore: 85,
      balanceScore: 90,
      totalReps: 1,
      duration: 30,
    };

    expect(session.id).toBe('test-uuid');
    expect(session.sets).toHaveLength(1);
    expect(session.sets[0].reps[0].formScore).toBe(85);
  });

  it('should create FormIssue with all severity levels', () => {
    const issues: FormIssue[] = [
      {
        type: 'asymmetry',
        severity: 'low',
        detail: 'Left shoulder 3% lower',
        values: { leftY: 0.3, rightY: 0.31 },
      },
      {
        type: 'kipping',
        severity: 'high',
        detail: 'Significant hip swing detected',
        values: { hipSwing: 25 },
      },
    ];

    expect(issues[0].severity).toBe('low');
    expect(issues[1].type).toBe('kipping');
  });
});

function createMockLandmarks(): LandmarkSnapshot {
  const point = (): Point3D => ({ x: 0, y: 0, z: 0, visibility: 1 });
  return {
    shoulderLeft: point(),
    shoulderRight: point(),
    elbowLeft: point(),
    elbowRight: point(),
    wristLeft: point(),
    wristRight: point(),
    hipLeft: point(),
    hipRight: point(),
    kneeLeft: point(),
    kneeRight: point(),
    nose: point(),
  };
}
