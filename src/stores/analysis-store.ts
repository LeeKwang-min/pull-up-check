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
  addRep: (formScore: number, issues: FormIssue[], tempo?: number, rom?: number) => void;
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

  addRep: (formScore, issues, tempo = 0, rom = 0) =>
    set((state) => {
      const rep: RepData = {
        repNumber: state.repCount + 1,
        formScore,
        tempo,
        rom,
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
      // formBreakdownRep 계산: 자세 점수가 60 이하로 떨어지는 첫 번째 렙
      let breakdownRep: number | null = null;
      const reps = state.currentSetReps;
      for (let i = 1; i < reps.length; i++) {
        if (reps[i].formScore < 60 && reps[i - 1].formScore >= 60) {
          breakdownRep = i + 1;
          break;
        }
      }

      const setData: SetData = {
        setNumber: state.currentSet,
        reps,
        averageFormScore:
          reps.length > 0
            ? reps.reduce((s, r) => s + r.formScore, 0) / reps.length
            : 0,
        formBreakdownRep: breakdownRep,
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
