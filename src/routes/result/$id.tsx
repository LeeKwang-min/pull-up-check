import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/result/$id')({
  component: ResultPage,
});

function ResultPage() {
  const { id } = Route.useParams();

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold">Session Result</h2>
      <p className="text-zinc-400 text-sm mt-1">Session: {id}</p>
      <p className="text-zinc-500 text-sm mt-4">Full report coming soon</p>
    </div>
  );
}
