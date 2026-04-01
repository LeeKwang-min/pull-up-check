import { create } from 'zustand';
import type { FormIssue, LandmarkSnapshot, RepData, SetData } from '../types/analysis';

interface AnalysisState {
  isAnalyzing: boolean;
  repCount: number;
  currentSet: number;
  landmarks: LandmarkSnapshot | null;
  alerts: FormIssue[];
  progress: number;
  sets: SetData[];
  currentSetReps: RepData[];

  startAnalysis: () => void;
  stopAnalysis: () => void;
  addRep: (formScore: number, issues: FormIssue[]) => void;
  addAlert: (alert: FormIssue) => void;
  updateLandmarks: (landmarks: LandmarkSnapshot) => void;
  updateProgress: (percent: number) => void;
  nextSet: () => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, _get) => ({
  isAnalyzing: false,
  repCount: 0,
  currentSet: 1,
  landmarks: null,
  alerts: [],
  progress: 0,
  sets: [],
  currentSetReps: [],

  startAnalysis: () => set({ isAnalyzing: true }),
  stopAnalysis: () => set({ isAnalyzing: false }),

  addRep: (formScore, issues) =>
    set((state) => {
      const rep: RepData = {
        repNumber: state.repCount + 1,
        formScore,
        tempo: 0,
        rom: 0,
        landmarks: state.landmarks ?? ({} as LandmarkSnapshot),
        issues,
      };
      return {
        repCount: state.repCount + 1,
        currentSetReps: [...state.currentSetReps, rep],
      };
    }),

  addAlert: (alert) =>
    set((state) => ({ alerts: [...state.alerts, alert] })),

  updateLandmarks: (landmarks) => set({ landmarks }),

  updateProgress: (percent) => set({ progress: percent }),

  nextSet: () =>
    set((state) => {
      const setData: SetData = {
        setNumber: state.currentSet,
        reps: state.currentSetReps,
        averageFormScore:
          state.currentSetReps.length > 0
            ? state.currentSetReps.reduce((s, r) => s + r.formScore, 0) /
              state.currentSetReps.length
            : 0,
        formBreakdownRep: null,
      };
      return {
        sets: [...state.sets, setData],
        currentSet: state.currentSet + 1,
        repCount: 0,
        currentSetReps: [],
        alerts: [],
      };
    }),

  reset: () =>
    set({
      isAnalyzing: false,
      repCount: 0,
      currentSet: 1,
      landmarks: null,
      alerts: [],
      progress: 0,
      sets: [],
      currentSetReps: [],
    }),
}));
