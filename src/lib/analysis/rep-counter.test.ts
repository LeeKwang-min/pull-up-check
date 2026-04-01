import { describe, it, expect, beforeEach } from 'vitest';
import { RepCounter } from './rep-counter';

describe('RepCounter', () => {
  let counter: RepCounter;

  beforeEach(() => {
    counter = new RepCounter();
  });

  it('should start at 0 reps', () => {
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('idle');
  });

  it('should not count until full cycle completes', () => {
    counter.update(170, 1000);
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('extended');
  });

  it('should count 1 rep after extend → flex → extend cycle', () => {
    counter.update(170, 1000);
    counter.update(160, 1100);
    counter.update(100, 1200);
    counter.update(50, 1300);
    counter.update(40, 1400);
    counter.update(90, 1500);
    counter.update(150, 1600);
    counter.update(170, 1700);

    expect(counter.count).toBe(1);
  });

  it('should track tempo for each rep', () => {
    counter.update(170, 1000);
    counter.update(40, 2000);
    counter.update(170, 3000);

    expect(counter.count).toBe(1);
    expect(counter.lastTempo).toBeCloseTo(2000);
  });

  it('should count multiple reps', () => {
    counter.update(170, 1000);
    counter.update(40, 2000);
    counter.update(170, 3000);
    counter.update(40, 4000);
    counter.update(170, 5000);

    expect(counter.count).toBe(2);
  });

  it('should track ROM as minimum angle reached', () => {
    counter.update(170, 1000);
    counter.update(35, 2000);
    counter.update(170, 3000);

    expect(counter.lastRom).toBeCloseTo(35);
  });

  it('should reset correctly', () => {
    counter.update(170, 1000);
    counter.update(40, 2000);
    counter.update(170, 3000);

    counter.reset();
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('idle');
  });
});
