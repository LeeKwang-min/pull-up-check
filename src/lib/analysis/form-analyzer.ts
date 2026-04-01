import type { CameraAngle, LandmarkSnapshot, FormIssue } from '../../types/analysis';
import { analyzeFrontBack } from './rule-sets/front-back';
import { analyzeSide, resetSideState } from './rule-sets/side';
import { computeFormScore } from './rule-sets/shared';

export class FormAnalyzer {
  private angle: CameraAngle;

  constructor(angle: CameraAngle) {
    this.angle = angle;
    resetSideState();
  }

  analyze(landmarks: LandmarkSnapshot): FormIssue[] {
    switch (this.angle) {
      case 'front':
      case 'back':
        return analyzeFrontBack(landmarks);
      case 'side':
        return analyzeSide(landmarks);
    }
  }

  computeFormScore(issues: FormIssue[]): number {
    return computeFormScore(issues);
  }
}
