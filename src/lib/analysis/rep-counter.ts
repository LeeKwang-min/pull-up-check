export type RepPhase = 'idle' | 'extended' | 'flexing' | 'flexed' | 'extending';

const EXTENDED_THRESHOLD = 158;
const FLEXED_THRESHOLD = 90;
const HYSTERESIS = 10;
const MIN_REP_DURATION_MS = 800;
const MAX_REP_DURATION_MS = 8000;  // 8초 초과 → 비정상 렙 (템포 풀업 허용)
const FAST_ECCENTRIC_MS = 800;     // 하강이 800ms 미만 → 너무 빠름
const SMOOTHING_WINDOW = 7;
const MAX_LR_DIFF = 50;
const MIN_PHASE_FRAMES = 3;
const MAX_ANGLE_JUMP = 80;         // 프레임 간 각도 변화 80°+ → 무시

export class RepCounter {
  count = 0;
  phase: RepPhase = 'idle';
  lastTempo = 0;
  lastRom = 0;

  /** flexing에서 90° 미달로 되돌아갈 때 true */
  incompleteRomDetected = false;
  /** extending→extended 구간이 FAST_ECCENTRIC_MS 미만일 때 true */
  eccentricTooFast = false;
  lastEccentricMs = 0;

  private repStartTime = 0;
  private extendingStartTime = 0;
  private minAngle = 180;
  private lastRepCompletedTime = 0;
  private angleBuffer: number[] = [];
  private phaseFrameCount = 0;
  private pendingPhase: RepPhase | null = null;
  private lastRawAngle = -1;
  private skipNextRep = false;

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

    // 마운트 감지: idle→extended 직후 첫 사이클은 마운트 동작으로 스킵
    if (nextPhase === 'extended' && this.phase === 'idle') {
      this.skipNextRep = true;
    }

    // flexing에서 90° 미달로 되돌아감 → 불완전 ROM
    if (nextPhase === 'extended' && this.phase === 'flexing') {
      this.incompleteRomDetected = true;
    }

    // extending 시작 시점 기록 (하강 속도 측정용)
    if (nextPhase === 'extending' && this.phase !== 'extending') {
      this.extendingStartTime = timestamp;
    }

    // extended로 진입하면서 extending에서 온 경우 = 렙 완료 후보
    if (nextPhase === 'extended' && this.phase === 'extending') {
      // 하강 속도 체크
      const eccentricDuration = timestamp - this.extendingStartTime;
      this.lastEccentricMs = eccentricDuration;
      if (eccentricDuration > 0 && eccentricDuration < FAST_ECCENTRIC_MS) {
        this.eccentricTooFast = true;
      }
      if (this.skipNextRep) {
        this.skipNextRep = false;
      } else {
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
    }

    // 상태 업데이트
    this.phase = nextPhase;

    if (nextPhase === 'extended') {
      this.minAngle = 180;
    } else if (nextPhase === 'flexing') {
      this.repStartTime = timestamp;
      this.minAngle = angle;
    }

    return repCompleted;
  }

  reset(): void {
    this.count = 0;
    this.phase = 'idle';
    this.lastTempo = 0;
    this.lastRom = 0;
    this.incompleteRomDetected = false;
    this.eccentricTooFast = false;
    this.lastEccentricMs = 0;
    this.repStartTime = 0;
    this.extendingStartTime = 0;
    this.minAngle = 180;
    this.lastRepCompletedTime = 0;
    this.angleBuffer = [];
    this.phaseFrameCount = 0;
    this.pendingPhase = null;
    this.lastRawAngle = -1;
    this.skipNextRep = false;
  }
}
