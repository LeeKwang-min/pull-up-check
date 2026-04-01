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
    counter.update(160, 1000);
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('extended');
  });

  it('should count 1 rep after full cycle with realistic timing', () => {
    // Extended (arm straight)
    for (let i = 0; i < 5; i++) counter.update(160, 1000 + i * 50);
    // Flexing (pulling up)
    for (let i = 0; i < 5; i++) counter.update(120, 1250 + i * 50);
    // Flexed (top of pull-up)
    for (let i = 0; i < 5; i++) counter.update(60, 1500 + i * 50);
    // Extending (lowering)
    for (let i = 0; i < 5; i++) counter.update(120, 1750 + i * 50);
    // Extended again
    for (let i = 0; i < 5; i++) counter.update(160, 2000 + i * 50);

    expect(counter.count).toBe(1);
  });

  it('should reject reps faster than 800ms', () => {
    for (let i = 0; i < 3; i++) counter.update(160, 1000 + i * 30);
    for (let i = 0; i < 3; i++) counter.update(60, 1100 + i * 30);
    for (let i = 0; i < 3; i++) counter.update(160, 1400 + i * 30);

    expect(counter.count).toBe(0);
  });

  it('should track tempo for each rep', () => {
    for (let i = 0; i < 5; i++) counter.update(160, 1000 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(60, 1500 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(160, 2500 + i * 50);

    expect(counter.count).toBe(1);
    expect(counter.lastTempo).toBeGreaterThanOrEqual(800);
  });

  it('should count multiple reps', () => {
    for (let i = 0; i < 5; i++) counter.update(160, 1000 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(60, 1500 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(160, 2500 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(60, 3500 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(160, 4500 + i * 50);

    expect(counter.count).toBe(2);
  });

  it('should track ROM as minimum angle reached', () => {
    for (let i = 0; i < 5; i++) counter.update(160, 1000 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(45, 1500 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(160, 2500 + i * 50);

    expect(counter.count).toBe(1);
    expect(counter.lastRom).toBeLessThan(90);
  });

  it('should reset correctly', () => {
    for (let i = 0; i < 5; i++) counter.update(160, 1000 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(60, 1500 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(160, 2500 + i * 50);

    counter.reset();
    expect(counter.count).toBe(0);
    expect(counter.phase).toBe('idle');
  });

  it('should not count incomplete reps without full flexion', () => {
    for (let i = 0; i < 5; i++) counter.update(160, 1000 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(120, 1500 + i * 50);
    for (let i = 0; i < 5; i++) counter.update(160, 2500 + i * 50);

    expect(counter.count).toBe(0);
  });
});
