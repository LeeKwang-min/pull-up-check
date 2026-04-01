import { describe, it, expect, beforeEach } from 'vitest';
import { useAnalysisStore } from './analysis-store';

describe('analysisStore', () => {
  beforeEach(() => {
    useAnalysisStore.getState().reset();
  });

  it('should start with default state', () => {
    const state = useAnalysisStore.getState();
    expect(state.isAnalyzing).toBe(false);
    expect(state.repCount).toBe(0);
    expect(state.currentSet).toBe(1);
    expect(state.alerts).toEqual([]);
  });

  it('should increment rep count', () => {
    useAnalysisStore.getState().addRep(85, []);
    expect(useAnalysisStore.getState().repCount).toBe(1);
  });

  it('should track form alerts', () => {
    const alert = {
      type: 'asymmetry' as const,
      severity: 'medium' as const,
      detail: 'Left shoulder lower',
      values: {},
    };
    useAnalysisStore.getState().addAlert(alert);
    expect(useAnalysisStore.getState().alerts).toHaveLength(1);
  });

  it('should advance to next set', () => {
    useAnalysisStore.getState().addRep(90, []);
    useAnalysisStore.getState().nextSet();
    expect(useAnalysisStore.getState().currentSet).toBe(2);
    expect(useAnalysisStore.getState().repCount).toBe(0);
  });

  it('should store tempo and rom in rep data', () => {
    useAnalysisStore.getState().addRep(85, [], 2400, 35);
    const reps = useAnalysisStore.getState().currentSetReps;
    expect(reps[0].tempo).toBe(2400);
    expect(reps[0].rom).toBe(35);
  });

  it('should compute formBreakdownRep when form degrades', () => {
    const { addRep, nextSet } = useAnalysisStore.getState();
    addRep(90, []);
    addRep(85, []);
    addRep(70, []);
    addRep(55, []); // drops below 60, prev was 70 (>=60) → breakdown at rep 4
    addRep(40, []);
    nextSet();

    const sets = useAnalysisStore.getState().sets;
    expect(sets[0].formBreakdownRep).toBe(4);
  });

  it('should return null formBreakdownRep when form stays good', () => {
    const { addRep, nextSet } = useAnalysisStore.getState();
    addRep(90, []);
    addRep(85, []);
    addRep(80, []);
    nextSet();

    const sets = useAnalysisStore.getState().sets;
    expect(sets[0].formBreakdownRep).toBeNull();
  });
});
