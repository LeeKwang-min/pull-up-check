import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold">Settings</h2>
      <p className="text-zinc-400 text-sm mt-1">Coming soon</p>
    </div>
  );
}
