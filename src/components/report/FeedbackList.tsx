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
      feedback.push({ text: `Average rep count decreased by ${avgDrop.toFixed(1)} reps per set`, severity: 'info' });
    }
  }

  sets.forEach((set) => {
    const scores = set.reps.map((r) => r.formScore);
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < 60 && scores[i - 1] >= 60) {
        feedback.push({ text: `Set ${set.setNumber}: Form started breaking from rep ${i + 1}`, severity: 'medium' });
        break;
      }
    }
  });

  const allIssues = sets.flatMap((s) => s.reps.flatMap((r) => r.issues));
  const shoulderIssues = allIssues.filter((i) => i.type === 'asymmetry' && i.detail.includes('shoulder'));
  if (shoulderIssues.length > 0) {
    const avgAsym = shoulderIssues.reduce((sum, i) => sum + Math.abs(i.values.shoulderAsymmetry ?? 0), 0) / shoulderIssues.length;
    const side = shoulderIssues[0].detail.includes('left') ? 'Left' : 'Right';
    feedback.push({ text: `${side} shoulder was ${avgAsym.toFixed(1)}% lower on average`, severity: avgAsym > 10 ? 'high' : 'medium' });
  }

  return feedback;
}

const severityStyles = {
  info: 'bg-blue-900/30 border-blue-800 text-blue-300',
  low: 'bg-green-900/30 border-green-800 text-green-300',
  medium: 'bg-yellow-900/30 border-yellow-800 text-yellow-300',
  high: 'bg-red-900/30 border-red-800 text-red-300',
};

export function FeedbackList({ sets }: FeedbackListProps) {
  const feedback = generateFeedback(sets);
  if (feedback.length === 0) {
    return <div className="bg-zinc-900 rounded-xl p-4 text-center text-zinc-500 text-sm">Great form! No issues detected.</div>;
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-zinc-300">Improvement Feedback</h3>
      {feedback.map((fb, i) => (
        <div key={i} className={`border rounded-lg px-3 py-2 text-sm ${severityStyles[fb.severity]}`}>{fb.text}</div>
      ))}
    </div>
  );
}
