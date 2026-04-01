export type RepPhase = 'idle' | 'extended' | 'flexing' | 'flexed' | 'extending';

const EXTENDED_THRESHOLD = 140;
const FLEXED_THRESHOLD = 70;

export class RepCounter {
  count = 0;
  phase: RepPhase = 'idle';
  lastTempo = 0;
  lastRom = 0;

  private repStartTime = 0;
  private minAngle = 180;

  update(elbowAngle: number, timestamp: number): boolean {
    let repCompleted = false;
    let prevPhase: RepPhase | null = null;

    // Loop to allow multi-step transitions within a single frame
    while (prevPhase !== this.phase) {
      prevPhase = this.phase;

      switch (this.phase) {
        case 'idle':
          if (elbowAngle >= EXTENDED_THRESHOLD) {
            this.phase = 'extended';
            this.repStartTime = timestamp;
          }
          break;

        case 'extended':
          if (elbowAngle < EXTENDED_THRESHOLD) {
            this.phase = 'flexing';
            this.minAngle = elbowAngle;
          }
          break;

        case 'flexing':
          this.minAngle = Math.min(this.minAngle, elbowAngle);
          if (elbowAngle <= FLEXED_THRESHOLD) {
            this.phase = 'flexed';
          }
          break;

        case 'flexed':
          this.minAngle = Math.min(this.minAngle, elbowAngle);
          if (elbowAngle > FLEXED_THRESHOLD) {
            this.phase = 'extending';
          }
          break;

        case 'extending':
          if (elbowAngle >= EXTENDED_THRESHOLD) {
            this.count++;
            this.lastTempo = timestamp - this.repStartTime;
            this.lastRom = this.minAngle;
            this.phase = 'extended';
            this.repStartTime = timestamp;
            this.minAngle = 180;
            repCompleted = true;
          } else if (elbowAngle <= FLEXED_THRESHOLD) {
            this.phase = 'flexed';
          }
          break;
      }
    }

    return repCompleted;
  }

  reset(): void {
    this.count = 0;
    this.phase = 'idle';
    this.lastTempo = 0;
    this.lastRom = 0;
    this.repStartTime = 0;
    this.minAngle = 180;
  }
}
