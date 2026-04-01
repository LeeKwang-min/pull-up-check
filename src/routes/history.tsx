import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/history')({
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold">History</h2>
      <p className="text-zinc-400 text-sm mt-1">Coming soon</p>
    </div>
  );
}
