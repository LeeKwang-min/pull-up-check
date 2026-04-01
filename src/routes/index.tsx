import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8 text-center">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Pull-Up Check</h1>
        <p className="text-zinc-400 mt-2">AI-powered pull-up form analysis</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          to="/analyze"
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl text-center transition-colors"
        >
          Start Analysis
        </Link>
        <Link
          to="/history"
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-3 px-6 rounded-xl text-center transition-colors"
        >
          View History
        </Link>
      </div>

      <p className="text-xs text-zinc-600 max-w-xs">
        All processing happens on your device. No video data is uploaded or sent to any server.
      </p>
    </div>
  );
}
