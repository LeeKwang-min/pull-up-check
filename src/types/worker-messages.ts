import type { CameraAngle, LandmarkSnapshot, FormIssue, SetData } from './analysis';

// Main → Worker
export type WorkerInMessage =
  | { type: 'init'; config: { angle: CameraAngle; modelPath: string } }
  | { type: 'frame'; imageData: ImageBitmap; timestamp: number }
  | { type: 'start-set' }
  | { type: 'end-set' }
  | { type: 'stop' };

// Worker → Main
export type WorkerOutMessage =
  | { type: 'ready' }
  | { type: 'landmarks'; data: LandmarkSnapshot; timestamp: number }
  | { type: 'rep'; count: number; formScore: number; details: FormIssue[] }
  | { type: 'form-alert'; issue: FormIssue }
  | { type: 'progress'; percent: number }
  | { type: 'set-summary'; stats: SetData }
  | { type: 'error'; message: string };
