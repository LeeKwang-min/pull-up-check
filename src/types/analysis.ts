export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface LandmarkSnapshot {
  shoulderLeft: Point3D;
  shoulderRight: Point3D;
  elbowLeft: Point3D;
  elbowRight: Point3D;
  wristLeft: Point3D;
  wristRight: Point3D;
  hipLeft: Point3D;
  hipRight: Point3D;
  kneeLeft: Point3D;
  kneeRight: Point3D;
  nose: Point3D;
}

export type CameraAngle = 'front' | 'back' | 'side';
export type InputMode = 'camera' | 'upload';
export type FormIssueType = 'asymmetry' | 'kipping' | 'incomplete_rom' | 'body_swing';
export type Severity = 'low' | 'medium' | 'high';

export interface FormIssue {
  type: FormIssueType;
  severity: Severity;
  detail: string;
  values: Record<string, number>;
}

export interface RepData {
  repNumber: number;
  formScore: number;
  tempo: number;
  rom: number;
  landmarks: LandmarkSnapshot;
  issues: FormIssue[];
}

export interface SetData {
  setNumber: number;
  reps: RepData[];
  averageFormScore: number;
  formBreakdownRep: number | null;
}

export interface Session {
  id: string;
  date: Date;
  angle: CameraAngle;
  inputMode: InputMode;
  sets: SetData[];
  overallScore: number;
  balanceScore: number;
  totalReps: number;
  duration: number;
}
