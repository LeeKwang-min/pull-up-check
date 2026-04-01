export type RepPhase = 'idle' | 'extended' | 'flexing' | 'flexed' | 'extending';

const EXTENDED_THRESHOLD = 150;
const FLEXED_THRESHOLD = 90;
const MIN_REP_DURATION_MS = 800;
const SMOOTHING_WINDOW = 5;

export class RepCounter {
  count = 0;
  phase: RepPhase = 'idle';
  lastTempo = 0;
  lastRom = 0;

  private repStartTime = 0;
  private minAngle = 180;
  private lastRepCompletedTime = 0;
  private angleBuffer: number[] = [];

  update(elbowAngle: number, timestamp: number): boolean {
    // 이동 평균 스무딩으로 노이즈 제거
    this.angleBuffer.push(elbowAngle);
    if (this.angleBuffer.length > SMOOTHING_WINDOW) {
      this.angleBuffer.shift();
    }
    const smoothed = this.angleBuffer.reduce((a, b) => a + b, 0) / this.angleBuffer.length;

    let repCompleted = false;
    let prevPhase: RepPhase | null = null;

    while (prevPhase !== this.phase) {
      prevPhase = this.phase;

      switch (this.phase) {
        case 'idle':
          if (smoothed >= EXTENDED_THRESHOLD) {
            this.phase = 'extended';
            this.repStartTime = timestamp;
          }
          break;

        case 'extended':
          if (smoothed < EXTENDED_THRESHOLD - 10) {
            this.phase = 'flexing';
            this.minAngle = smoothed;
          }
          break;

        case 'flexing':
          this.minAngle = Math.min(this.minAngle, smoothed);
          if (smoothed <= FLEXED_THRESHOLD) {
            this.phase = 'flexed';
          }
          // 다시 펴지면 불완전 렙으로 리셋
          if (smoothed >= EXTENDED_THRESHOLD) {
            this.phase = 'extended';
            this.repStartTime = timestamp;
            this.minAngle = 180;
          }
          break;

        case 'flexed':
          this.minAngle = Math.min(this.minAngle, smoothed);
          if (smoothed > FLEXED_THRESHOLD + 10) {
            this.phase = 'extending';
          }
          break;

        case 'extending':
          if (smoothed >= EXTENDED_THRESHOLD) {
            const elapsed = timestamp - this.repStartTime;
            const sinceLastRep = timestamp - this.lastRepCompletedTime;

            // 최소 렙 시간 + 최소 간격 충족해야 카운트
            if (elapsed >= MIN_REP_DURATION_MS && sinceLastRep >= MIN_REP_DURATION_MS) {
              this.count++;
              this.lastTempo = elapsed;
              this.lastRom = this.minAngle;
              this.lastRepCompletedTime = timestamp;
              repCompleted = true;
            }

            this.phase = 'extended';
            this.repStartTime = timestamp;
            this.minAngle = 180;
          } else if (smoothed <= FLEXED_THRESHOLD) {
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
    this.lastRepCompletedTime = 0;
    this.angleBuffer = [];
  }
}
