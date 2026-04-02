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
      feedback.push({ text: `종합 ${Math.round(overallScore)}점 — 깔끔한 폼입니다. 이대로 유지하세요.`, severity: 'positive' });
    } else if (overallScore >= 60) {
      feedback.push({ text: `종합 ${Math.round(overallScore)}점 — 몇 가지 교정 포인트가 있습니다.`, severity: 'info' });
    } else {
      feedback.push({ text: `종합 ${Math.round(overallScore)}점 — 기본 폼부터 다시 잡아야 합니다.`, severity: 'high' });
    }
  }

  // --- 밸런스 점수 (정면/후면) ---
  if (balanceScore !== undefined && (angle === 'front' || angle === 'back')) {
    if (balanceScore >= 90) {
      feedback.push({ text: '좌우 균형 양호 — 양쪽 근력 차이가 거의 없습니다.', severity: 'positive' });
    } else if (balanceScore >= 70) {
      feedback.push({ text: `밸런스 ${Math.round(balanceScore)}점 — 한쪽으로 치우치는 경향이 있습니다.`, severity: 'info' });
    } else {
      feedback.push({ text: `밸런스 ${Math.round(balanceScore)}점 — 좌우 근력 차이가 큽니다. 약한 쪽 단독 운동을 추천합니다.`, severity: 'high' });
    }
  }

  // --- 폼 안정성 (측면) ---
  if (balanceScore !== undefined && angle === 'side') {
    if (balanceScore >= 90) {
      feedback.push({ text: '코어 안정성 양호 — 몸통 흔들림 없이 수행했습니다.', severity: 'positive' });
    } else if (balanceScore >= 70) {
      feedback.push({ text: `폼 안정성 ${Math.round(balanceScore)}점 — 가벼운 흔들림이 있습니다. 코어에 집중해 보세요.`, severity: 'info' });
    } else {
      feedback.push({ text: `폼 안정성 ${Math.round(balanceScore)}점 — 반동에 의존하고 있습니다. 데드행 자세에서 시작해 보세요.`, severity: 'high' });
    }

    const allIssues = sets.flatMap((s) => s.reps.flatMap((r) => r.issues));
    const swingIssues = allIssues.filter((i) => i.type === 'body_swing');
    const kippingIssues = allIssues.filter((i) => i.type === 'kipping');

    if (swingIssues.length > 0) {
      const highSwing = swingIssues.filter((i) => i.severity === 'high').length;
      if (highSwing > 0) {
        feedback.push({ text: `심한 몸통 흔들림 ${highSwing}회 — 복부와 둔근에 힘을 유지하세요.`, severity: 'high' });
      } else {
        feedback.push({ text: `가벼운 몸통 흔들림 ${swingIssues.length}회 감지.`, severity: 'medium' });
      }
    }

    if (kippingIssues.length > 0) {
      feedback.push({
        text: `키핑 ${kippingIssues.length}회 감지 — 하체를 고정하고 상체 힘만으로 당겨보세요.`,
        severity: kippingIssues.length > 3 ? 'high' : 'medium',
      });
    }

    if (swingIssues.length === 0 && kippingIssues.length === 0) {
      feedback.push({ text: '스트릭트 풀업 달성 — 반동 없이 깨끗하게 수행했습니다.', severity: 'positive' });
    }
  }

  // --- ROM 분석 (측면) ---
  if (angle === 'side') {
    const allRoms = sets.flatMap((s) => s.reps.map((r) => r.rom).filter((r) => r > 0));
    if (allRoms.length > 0) {
      const avgRom = allRoms.reduce((a, b) => a + b, 0) / allRoms.length;
      if (avgRom <= 60) {
        feedback.push({ text: `팔꿈치 최소 각도 ${avgRom.toFixed(0)}° — 충분한 가동범위입니다.`, severity: 'positive' });
      } else if (avgRom <= 90) {
        feedback.push({ text: `팔꿈치 최소 각도 ${avgRom.toFixed(0)}° — 턱이 바를 넘을 때까지 5~10° 더 당겨보세요.`, severity: 'info' });
      } else {
        feedback.push({ text: `팔꿈치 최소 각도 ${avgRom.toFixed(0)}° — 가동범위가 부족합니다. 네거티브 풀업으로 범위를 늘려보세요.`, severity: 'high' });
      }
    }
  }

  // --- 부위별 비대칭 상세 (정면/후면) ---
  if (asymmetryDetails && (angle === 'front' || angle === 'back')) {
    const { shoulder, shoulderBias, elbow, elbowBias, hip, hipBias, kneeGap, elbowWidth, elbowWidthBias } = asymmetryDetails;

    if (shoulder > 3) {
      const side = biasDirection(shoulderBias);
      feedback.push({
        text: `${side} 어깨가 ${shoulder.toFixed(1)}% 낮음 — 승모근 활성화 차이를 확인하세요.`,
        severity: shoulder > 7 ? 'high' : 'medium',
      });
    }

    if (elbow > 5) {
      const side = biasDirection(elbowBias);
      feedback.push({
        text: `${side} 팔꿈치가 ${elbow.toFixed(1)}% 더 낮음 — 양팔 근력 차이를 점검하세요.`,
        severity: elbow > 10 ? 'high' : 'medium',
      });
    }

    if (hip > 3) {
      const side = biasDirection(hipBias);
      feedback.push({
        text: `${side} 골반이 ${hip.toFixed(1)}% 내려감 — 코어 안정성을 확인하세요.`,
        severity: hip > 7 ? 'high' : 'medium',
      });
    }

    if (elbowWidth > 10) {
      const side = biasDirection(elbowWidthBias);
      feedback.push({
        text: `${side} 팔꿈치가 ${elbowWidth.toFixed(1)}% 더 벌어짐 — 광배근 활성화를 균등하게 하세요.`,
        severity: elbowWidth > 20 ? 'high' : 'medium',
      });
    }

    if (kneeGap > 150) {
      const excess = kneeGap - 140;
      feedback.push({
        text: `다리가 골반 대비 ${excess.toFixed(0)}% 벌어짐 — 하체 긴장을 유지하세요.`,
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
        text: `${sets.length}세트 동안 ${first}회 → ${last}회로 감소 (${dropRate}%↓) — 세트 간 휴식을 90초 이상 확보해 보세요.`,
        severity: dropRate > 50 ? 'medium' : 'info',
      });
    }
  }

  // --- 자세 무너짐 구간 ---
  for (const set of sets) {
    if (set.formBreakdownRep !== null) {
      feedback.push({
        text: `세트 ${set.setNumber}: ${set.formBreakdownRep}회차부터 폼이 무너집니다. 해당 횟수를 세트 한계로 설정해 보세요.`,
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
      feedback.push({ text: `렙당 평균 ${(avgTempo / 1000).toFixed(1)}초 — 일정한 리듬으로 잘 수행했습니다.`, severity: 'positive' });
    } else if (cv > 0.35) {
      feedback.push({ text: '렙 속도 편차가 큽니다 — "2초 올리고 3초 내리기" 리듬을 시도해 보세요.', severity: 'info' });
    }
  }

  return feedback;
}

const severityStyles: Record<FeedbackSeverity, string> = {
  positive: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  info: 'bg-stone-50 border-stone-200 text-stone-600',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  high: 'bg-red-50 border-red-200 text-red-700',
};

export function FeedbackList(props: FeedbackListProps) {
  const feedback = generateFeedback(props);

  if (feedback.length === 0) {
    return (
      <div className="surface-card rounded-2xl py-5 px-4 text-center text-stone-400 text-sm">
        3렙 이상 수행해야 정확한 분석이 가능합니다.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <h3 className="section-label">이번 세션 피드백</h3>
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
