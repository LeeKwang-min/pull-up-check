import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CameraAngle, InputMode } from '../types/analysis';

interface SessionState {
  defaultAngle: CameraAngle;
  lastInputMode: InputMode;
  setDefaultAngle: (angle: CameraAngle) => void;
  setLastInputMode: (mode: InputMode) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      defaultAngle: 'back',
      lastInputMode: 'camera',
      setDefaultAngle: (angle) => set({ defaultAngle: angle }),
      setLastInputMode: (mode) => set({ lastInputMode: mode }),
    }),
    { name: 'pullup-check-settings' },
  ),
);
