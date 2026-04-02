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
export type FormIssueType = 'asymmetry' | 'kipping' | 'incomplete_rom' | 'body_swing' | 'leg_spread' | 'elbow_width' | 'shoulder_shrug' | 'chin_not_over_bar' | 'fast_eccentric';
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

export interface AsymmetryDetails {
  shoulder: number;
  elbow: number;
  hip: number;
  /** 양수 = 오른쪽이 더 낮음, 음수 = 왼쪽이 더 낮음 */
  shoulderBias: number;
  elbowBias: number;
  hipBias: number;
  /** 무릎 간격 (어깨 너비 대비 %) */
  kneeGap: number;
  /** 팔꿈치 너비 비대칭 (절대값 %) */
  elbowWidth: number;
  /** 양수 = 오른쪽이 더 벌어짐 */
  elbowWidthBias: number;
}

export interface Session {
  id: string;
  date: Date;
  angle: CameraAngle;
  inputMode: InputMode;
  sets: SetData[];
  overallScore: number;
  balanceScore: number;
  asymmetryDetails?: AsymmetryDetails;
  totalReps: number;
  duration: number;
}
