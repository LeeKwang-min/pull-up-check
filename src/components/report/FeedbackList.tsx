import type { SetData, AsymmetryDetails, CameraAngle } from '../../types/analysis';

interface FeedbackListProps {
  sets: SetData[];
  overallScore?: number;
  balanceScore?: number;
  asymmetryDetails?: AsymmetryDetails;
  totalReps?: number;
  angle?: CameraAngle;
}

type FeedbackSeverity = 'positive' | 'info' | 'medium' | 'high';

interface Feedback {
  text: string;
  severity: FeedbackSeverity;
}

function biasDirection(bias: number): string {
  return bias > 0 ? '오른쪽' : '왼쪽';
}

function generateFeedback({
  sets,
  overallScore,
  balanceScore,
  asymmetryDetails,
  totalReps,
  angle,
}: FeedbackListProps): Feedback[] {
  const feedback: Feedback[] = [];
  const repsTotal = totalReps ?? sets.reduce((s, set) => s + set.reps.length, 0);

  if (repsTotal === 0) return feedback;

  // --- 종합 점수 요약 ---
  if (overallScore !== undefined) {
    if (overallScore >= 80) {
      feedback.push({ text: `종합 ${Math.round(overallScore)}점 — 안정적인 자세로 수행했습니다`, severity: 'positive' });
    } else if (overallScore >= 60) {
      feedback.push({ text: `종합 ${Math.round(overallScore)}점 — 부분적으로 개선이 필요합니다`, severity: 'info' });
    } else {
      feedback.push({ text: `종합 ${Math.round(overallScore)}점 — 자세 교정에 집중이 필요합니다`, severity: 'high' });
    }
  }

  // --- 밸런스 점수 (정면/후면) ---
  if (balanceScore !== undefined && (angle === 'front' || angle === 'back')) {
    if (balanceScore >= 90) {
      feedback.push({ text: '좌우 균형이 잘 잡혀 있습니다', severity: 'positive' });
    } else if (balanceScore >= 70) {
      feedback.push({ text: `밸런스 ${Math.round(balanceScore)}점 — 약간의 좌우 불균형이 감지되었습니다`, severity: 'info' });
    } else {
      feedback.push({ text: `밸런스 ${Math.round(balanceScore)}점 — 좌우 불균형이 뚜렷합니다`, severity: 'high' });
    }
  }

  // --- 폼 안정성 (측면) ---
  if (balanceScore !== undefined && angle === 'side') {
    if (balanceScore >= 90) {
      feedback.push({ text: '몸통이 안정적으로 유지되었습니다', severity: 'positive' });
    } else if (balanceScore >= 70) {
      feedback.push({ text: `폼 안정성 ${Math.round(balanceScore)}점 — 약간의 흔들림이 감지되었습니다`, severity: 'info' });
    } else {
      feedback.push({ text: `폼 안정성 ${Math.round(balanceScore)}점 — 몸통 흔들림과 키핑이 잦습니다`, severity: 'high' });
    }

    // 측면 전용: 세트 데이터에서 swing/kipping 이슈 분석
    const allIssues = sets.flatMap((s) => s.reps.flatMap((r) => r.issues));
    const swingIssues = allIssues.filter((i) => i.type === 'body_swing');
    const kippingIssues = allIssues.filter((i) => i.type === 'kipping');

    if (swingIssues.length > 0) {
      const highSwing = swingIssues.filter((i) => i.severity === 'high').length;
      if (highSwing > 0) {
        feedback.push({ text: `심한 몸통 흔들림이 ${highSwing}회 감지되었습니다 — 코어에 힘을 유지하세요`, severity: 'high' });
      } else {
        feedback.push({ text: `가벼운 몸통 흔들림이 ${swingIssues.length}회 감지되었습니다`, severity: 'medium' });
      }
    }

    if (kippingIssues.length > 0) {
      feedback.push({
        text: `키핑이 ${kippingIssues.length}회 감지되었습니다 — 무릎을 들어올리지 않도록 주의하세요`,
        severity: kippingIssues.length > 3 ? 'high' : 'medium',
      });
    }

    if (swingIssues.length === 0 && kippingIssues.length === 0) {
      feedback.push({ text: '몸통 흔들림과 키핑 없이 깨끗하게 수행했습니다', severity: 'positive' });
    }
  }

  // --- ROM 분석 (측면에서 특히 유의미) ---
  if (angle === 'side') {
    const allRoms = sets.flatMap((s) => s.reps.map((r) => r.rom).filter((r) => r > 0));
    if (allRoms.length > 0) {
      const avgRom = allRoms.reduce((a, b) => a + b, 0) / allRoms.length;
      if (avgRom <= 60) {
        feedback.push({ text: `평균 최소 각도 ${avgRom.toFixed(0)}° — 충분한 가동범위로 수행했습니다`, severity: 'positive' });
      } else if (avgRom <= 90) {
        feedback.push({ text: `평균 최소 각도 ${avgRom.toFixed(0)}° — 턱이 바 위로 올라가도록 더 당겨보세요`, severity: 'info' });
      } else {
        feedback.push({ text: `평균 최소 각도 ${avgRom.toFixed(0)}° — 가동범위가 부족합니다`, severity: 'high' });
      }
    }
  }

  // --- 부위별 비대칭 상세 (정면/후면만) ---
  if (asymmetryDetails && (angle === 'front' || angle === 'back')) {
    const { shoulder, shoulderBias, elbow, elbowBias, hip, hipBias, kneeGap, elbowWidth, elbowWidthBias } = asymmetryDetails;

    if (shoulder > 3) {
      const side = biasDirection(shoulderBias);
      feedback.push({
        text: `${side} 어깨가 평균 ${shoulder.toFixed(1)}% 낮습니다 — 승모근 활성화 차이를 확인하세요`,
        severity: shoulder > 7 ? 'high' : 'medium',
      });
    }

    if (elbow > 5) {
      const side = biasDirection(elbowBias);
      feedback.push({
        text: `${side} 팔꿈치가 평균 ${elbow.toFixed(1)}% 더 낮습니다 — 양팔 힘 균형을 점검하세요`,
        severity: elbow > 10 ? 'high' : 'medium',
      });
    }

    if (hip > 3) {
      const side = biasDirection(hipBias);
      feedback.push({
        text: `${side} 골반이 평균 ${hip.toFixed(1)}% 내려갑니다 — 코어 안정성을 확인하세요`,
        severity: hip > 7 ? 'high' : 'medium',
      });
    }

    if (elbowWidth > 10) {
      const side = biasDirection(elbowWidthBias);
      feedback.push({
        text: `${side} 팔꿈치가 더 벌어집니다 (${elbowWidth.toFixed(1)}%) — 광배근 활성화를 균등하게 하세요`,
        severity: elbowWidth > 20 ? 'high' : 'medium',
      });
    }

    if (kneeGap > 150) {
      const excess = kneeGap - 140;
      feedback.push({
        text: `다리가 골반 너비 대비 ${excess.toFixed(0)}% 벌어집니다 — 하체 긴장을 유지하세요`,
        severity: kneeGap > 200 ? 'high' : 'medium',
      });
    }
  }

  // --- 세트 간 횟수 감소 ---
  if (sets.length >= 2) {
    const first = sets[0].reps.length;
    const last = sets[sets.length - 1].reps.length;
    if (first > last && last > 0) {
      const dropRate = Math.round(((first - last) / first) * 100);
      feedback.push({
        text: `${sets.length}세트 동안 횟수가 ${first}회 → ${last}회로 감소했습니다 (${dropRate}% 감소)`,
        severity: dropRate > 50 ? 'medium' : 'info',
      });
    }
  }

  // --- 자세 무너짐 구간 ---
  for (const set of sets) {
    if (set.formBreakdownRep !== null) {
      feedback.push({
        text: `세트 ${set.setNumber}: ${set.formBreakdownRep}회차부터 자세가 무너지기 시작했습니다`,
        severity: 'medium',
      });
    }
  }

  // --- 템포 일관성 ---
  const allTempos = sets.flatMap((s) => s.reps.map((r) => r.tempo).filter((t) => t > 0));
  if (allTempos.length >= 3) {
    const avgTempo = allTempos.reduce((a, b) => a + b, 0) / allTempos.length;
    const variance = allTempos.reduce((s, t) => s + (t - avgTempo) ** 2, 0) / allTempos.length;
    const cv = Math.sqrt(variance) / avgTempo;

    if (cv < 0.15) {
      feedback.push({ text: `렙당 평균 ${(avgTempo / 1000).toFixed(1)}초 — 일정한 속도로 수행했습니다`, severity: 'positive' });
    } else if (cv > 0.35) {
      feedback.push({ text: '렙 속도가 불규칙합니다 — 일정한 템포를 유지해 보세요', severity: 'info' });
    }
  }

  return feedback;
}

const severityStyles: Record<FeedbackSeverity, string> = {
  positive: 'bg-emerald-500/8 border-emerald-500/15 text-emerald-300',
  info: 'bg-stone-800/40 border-stone-700/50 text-stone-300',
  medium: 'bg-yellow-500/8 border-yellow-500/15 text-yellow-300',
  high: 'bg-red-500/8 border-red-500/15 text-red-300',
};

export function FeedbackList(props: FeedbackListProps) {
  const feedback = generateFeedback(props);

  if (feedback.length === 0) {
    return (
      <div className="surface-card rounded-2xl py-5 px-4 text-center text-stone-500 text-sm">
        분석 데이터가 부족합니다. 더 많은 렙을 수행해 보세요.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <h3 className="section-label">분석 피드백</h3>
      <div className="space-y-2">
        {feedback.map((fb, i) => (
          <div key={i} className={`border rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${severityStyles[fb.severity]}`}>
            {fb.text}
          </div>
        ))}
      </div>
    </div>
  );
}
