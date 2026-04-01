export type RepPhase = 'idle' | 'extended' | 'flexing' | 'flexed' | 'extending';

const EXTENDED_THRESHOLD = 150;
const FLEXED_THRESHOLD = 90;
const HYSTERESIS = 10;
const MIN_REP_DURATION_MS = 800;
const MAX_REP_DURATION_MS = 3500;  // 3.5초 초과 → 마운트/디스마운트
const SMOOTHING_WINDOW = 7;
const MAX_LR_DIFF = 50;
const MIN_PHASE_FRAMES = 3;
const MAX_ANGLE_JUMP = 80;         // 프레임 간 각도 변화 80°+ → 무시

export class RepCounter {
  count = 0;
  phase: RepPhase = 'idle';
  lastTempo = 0;
  lastRom = 0;

  private repStartTime = 0;
  private minAngle = 180;
  private lastRepCompletedTime = 0;
  private angleBuffer: number[] = [];
  private phaseFrameCount = 0;
  private pendingPhase: RepPhase | null = null;
  private lastRawAngle = -1;

  /**
   * @param leftAngle 왼쪽 팔꿈치 각도
   * @param rightAngle 오른쪽 팔꿈치 각도
   * @param timestamp 밀리초 타임스탬프
   * @returns 렙 완료 여부
   */
  update(leftAngle: number, rightAngle: number, timestamp: number): boolean {
    // 좌우 차이가 너무 크면 이 프레임은 노이즈로 무시
    if (Math.abs(leftAngle - rightAngle) > MAX_LR_DIFF) {
      return false;
    }

    const raw = (leftAngle + rightAngle) / 2;

    // 프레임 간 각도 급변 무시 (바에서 내려오기 등)
    if (this.lastRawAngle >= 0 && Math.abs(raw - this.lastRawAngle) > MAX_ANGLE_JUMP) {
      this.lastRawAngle = raw;
      return false;
    }
    this.lastRawAngle = raw;

    // 이동 평균 스무딩
    this.angleBuffer.push(raw);
    if (this.angleBuffer.length > SMOOTHING_WINDOW) {
      this.angleBuffer.shift();
    }
    const smoothed = this.angleBuffer.reduce((a, b) => a + b, 0) / this.angleBuffer.length;

    const nextPhase = this.computeNextPhase(smoothed, timestamp);

    if (nextPhase !== this.phase) {
      // 상태 전환 디바운싱: 동일한 다음 상태가 MIN_PHASE_FRAMES 연속이어야 전환
      if (this.pendingPhase === nextPhase) {
        this.phaseFrameCount++;
      } else {
        this.pendingPhase = nextPhase;
        this.phaseFrameCount = 1;
      }

      if (this.phaseFrameCount >= MIN_PHASE_FRAMES) {
        const repCompleted = this.applyPhaseTransition(nextPhase, smoothed, timestamp);
        this.pendingPhase = null;
        this.phaseFrameCount = 0;
        return repCompleted;
      }
    } else {
      // 현재 상태 유지 → 펜딩 초기화
      this.pendingPhase = null;
      this.phaseFrameCount = 0;
    }

    // flexed 상태에서 최소 각도 추적은 매 프레임
    if (this.phase === 'flexed' || this.phase === 'flexing') {
      this.minAngle = Math.min(this.minAngle, smoothed);
    }

    return false;
  }

  private computeNextPhase(angle: number, _timestamp: number): RepPhase {
    switch (this.phase) {
      case 'idle':
        return angle >= EXTENDED_THRESHOLD ? 'extended' : 'idle';

      case 'extended':
        return angle < EXTENDED_THRESHOLD - HYSTERESIS ? 'flexing' : 'extended';

      case 'flexing':
        if (angle <= FLEXED_THRESHOLD) return 'flexed';
        if (angle >= EXTENDED_THRESHOLD) return 'extended'; // 불완전 동작 리셋
        return 'flexing';

      case 'flexed':
        return angle > FLEXED_THRESHOLD + HYSTERESIS ? 'extending' : 'flexed';

      case 'extending':
        if (angle >= EXTENDED_THRESHOLD) return 'extended';
        if (angle <= FLEXED_THRESHOLD) return 'flexed';
        return 'extending';

      default:
        return this.phase;
    }
  }

  private applyPhaseTransition(nextPhase: RepPhase, angle: number, timestamp: number): boolean {
    let repCompleted = false;

    // extended로 진입하면서 extending에서 온 경우 = 렙 완료 후보
    if (nextPhase === 'extended' && this.phase === 'extending') {
      const elapsed = timestamp - this.repStartTime;
      const sinceLastRep = timestamp - this.lastRepCompletedTime;

      if (
        elapsed >= MIN_REP_DURATION_MS &&
        elapsed <= MAX_REP_DURATION_MS &&
        sinceLastRep >= MIN_REP_DURATION_MS
      ) {
        this.count++;
        this.lastTempo = elapsed;
        this.lastRom = this.minAngle;
        this.lastRepCompletedTime = timestamp;
        repCompleted = true;
      }
    }

    // 상태 업데이트
    this.phase = nextPhase;

    if (nextPhase === 'extended') {
      this.repStartTime = timestamp;
      this.minAngle = 180;
    } else if (nextPhase === 'flexing') {
      this.minAngle = angle;
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
    this.phaseFrameCount = 0;
    this.pendingPhase = null;
    this.lastRawAngle = -1;
  }
}
