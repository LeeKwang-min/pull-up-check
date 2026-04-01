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
});
