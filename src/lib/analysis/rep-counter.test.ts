import { describe, it, expect, beforeEach } from 'vitest';
import { RepCounter } from './rep-counter';

// 좌우 동일 각도, 여러 프레임 입력 (15fps = 66ms 간격)
function feedN(counter: RepCounter, angle: number, startTs: number, frames: number, interval = 66) {
  for (let i = 0; i < frames; i++) {
    counter.update(angle, angle, startTs + i * interval);
  }
}

describe('RepCounter', () => {
  let counter: RepCounter;

  beforeEach(() => {
    counter = new RepCounter();
  });

  it('should start at 0 reps', () => {
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('idle');
  });

  it('should count 1 rep after full cycle', () => {
    feedN(counter, 160, 0, 10);       // extended (~0.66s)
    feedN(counter, 60, 700, 10);      // flexed (~0.66s)
    feedN(counter, 160, 1800, 10);    // back to extended → REP

    expect(counter.count).toBe(1);
  });

  it('should reject reps faster than 800ms', () => {
    feedN(counter, 160, 0, 4, 30);
    feedN(counter, 60, 120, 4, 30);
    feedN(counter, 160, 240, 4, 30);

    expect(counter.count).toBe(0);
  });

  it('should reject frames with large L/R difference', () => {
    feedN(counter, 160, 0, 10);
    // L/R 차이 100°+ → 전부 무시
    counter.update(155, 3, 700);
    counter.update(12, 48, 766);
    counter.update(155, 3, 833);

    expect(counter.phase).toBe('extended');
    expect(counter.count).toBe(0);
  });

  it('should count multiple reps', () => {
    feedN(counter, 160, 0, 10);
    feedN(counter, 60, 700, 10);
    feedN(counter, 160, 1800, 10);      // REP 1
    feedN(counter, 60, 3000, 10);
    feedN(counter, 160, 4200, 10);      // REP 2

    expect(counter.count).toBe(2);
  });

  it('should track tempo', () => {
    feedN(counter, 160, 0, 10);
    feedN(counter, 60, 700, 10);
    feedN(counter, 160, 1800, 10);

    expect(counter.count).toBe(1);
    expect(counter.lastTempo).toBeGreaterThanOrEqual(800);
  });

  it('should track ROM', () => {
    feedN(counter, 160, 0, 10);
    feedN(counter, 45, 700, 10);
    feedN(counter, 160, 1800, 10);

    expect(counter.count).toBe(1);
    expect(counter.lastRom).toBeLessThan(90);
  });

  it('should reset correctly', () => {
    feedN(counter, 160, 0, 10);
    feedN(counter, 60, 700, 10);
    feedN(counter, 160, 1800, 10);

    counter.reset();
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('idle');
  });

  it('should not count incomplete reps without full flexion', () => {
    feedN(counter, 160, 0, 10);
    feedN(counter, 120, 700, 10);     // never goes below FLEXED_THRESHOLD
    feedN(counter, 160, 1800, 10);

    expect(counter.count).toBe(0);
  });

  it('should debounce single-frame noise', () => {
    feedN(counter, 160, 0, 10);
    // 1 noisy frame then back to normal
    counter.update(130, 130, 700);
    feedN(counter, 160, 766, 5);

    expect(counter.phase).toBe('extended');
  });
});
