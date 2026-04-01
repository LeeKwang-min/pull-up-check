import { describe, it, expect } from 'vitest';
import {
  calculateAngle,
  calculateAsymmetry,
  calculateDisplacement,
} from './angle-calculator';
import type { Point3D } from '../../types/analysis';

const p = (x: number, y: number, z = 0): Point3D => ({
  x, y, z, visibility: 1,
});

describe('calculateAngle', () => {
  it('should return 180 for a straight line', () => {
    expect(calculateAngle(p(0, 0), p(1, 0), p(2, 0))).toBeCloseTo(180, 0);
  });

  it('should return 90 for a right angle', () => {
    expect(calculateAngle(p(0, 1), p(0, 0), p(1, 0))).toBeCloseTo(90, 0);
  });

  it('should return ~45 for a 45-degree angle', () => {
    expect(calculateAngle(p(0, 1), p(0, 0), p(1, 1))).toBeCloseTo(45, 0);
  });
});

describe('calculateAsymmetry', () => {
  it('should return 0 for identical values', () => {
    expect(calculateAsymmetry(0.5, 0.5)).toBeCloseTo(0);
  });

  it('should return positive percentage when left is higher (lower y)', () => {
    expect(calculateAsymmetry(0.4, 0.5)).toBeCloseTo(10);
  });

  it('should return negative percentage when right is higher', () => {
    expect(calculateAsymmetry(0.6, 0.5)).toBeCloseTo(-10);
  });
});

describe('calculateDisplacement', () => {
  it('should return 0 for same position', () => {
    expect(calculateDisplacement(p(0.5, 0.5), p(0.5, 0.5))).toBeCloseTo(0);
  });

  it('should return horizontal distance between two points', () => {
    expect(calculateDisplacement(p(0.3, 0.5), p(0.5, 0.5))).toBeCloseTo(0.2);
  });
});
