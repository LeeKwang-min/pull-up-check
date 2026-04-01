import type { SetData } from '../../types/analysis';

interface FeedbackListProps {
  sets: SetData[];
}

interface Feedback {
  text: string;
  severity: 'low' | 'medium' | 'high' | 'info';
}

function generateFeedback(sets: SetData[]): Feedback[] {
  const feedback: Feedback[] = [];
  if (sets.length === 0) return feedback;

  if (sets.length >= 2) {
    const first = sets[0].reps.length;
    const last = sets[sets.length - 1].reps.length;
    if (first > last) {
      const avgDrop = (first - last) / (sets.length - 1);
      feedback.push({ text: `세트당 평균 ${avgDrop.toFixed(1)}회씩 횟수가 감소했습니다`, severity: 'info' });
    }
  }

  sets.forEach((set) => {
    const scores = set.reps.map((r) => r.formScore);
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < 60 && scores[i - 1] >= 60) {
        feedback.push({ text: `세트 ${set.setNumber}: ${i + 1}회차부터 자세가 무너지기 시작했습니다`, severity: 'medium' });
        break;
      }
    }
  });

  const allIssues = sets.flatMap((s) => s.reps.flatMap((r) => r.issues));
  const shoulderIssues = allIssues.filter((i) => i.type === 'asymmetry' && i.detail.includes('어깨'));
  if (shoulderIssues.length > 0) {
    const avgAsym = shoulderIssues.reduce((sum, i) => sum + Math.abs(i.values.shoulderAsymmetry ?? 0), 0) / shoulderIssues.length;
    const side = (shoulderIssues[0].values.leftSide ?? 0) > 0 ? '왼쪽' : '오른쪽';
    feedback.push({ text: `${side} 어깨가 평균 ${avgAsym.toFixed(1)}% 낮았습니다`, severity: avgAsym > 10 ? 'high' : 'medium' });
  }

  return feedback;
}

const severityStyles = {
  info: 'bg-stone-800/50 border-stone-700 text-stone-300',
  low: 'bg-green-900/30 border-green-800 text-green-300',
  medium: 'bg-yellow-900/30 border-yellow-800 text-yellow-300',
  high: 'bg-red-900/30 border-red-800 text-red-300',
};

export function FeedbackList({ sets }: FeedbackListProps) {
  const feedback = generateFeedback(sets);
  if (feedback.length === 0) {
    return <div className="bg-stone-800 rounded-2xl p-4 border border-amber-500/10 text-center text-stone-400 text-sm">훌륭한 자세! 감지된 문제가 없습니다.</div>;
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider font-[Barlow_Condensed]">개선 피드백</h3>
      {feedback.map((fb, i) => (
        <div key={i} className={`border rounded-xl px-3 py-2 text-sm ${severityStyles[fb.severity]}`}>{fb.text}</div>
      ))}
    </div>
  );
}
