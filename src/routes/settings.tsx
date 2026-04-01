import { createFileRoute } from '@tanstack/react-router';
import { AngleSelector } from '../components/shared/AngleSelector';
import { useSessionStore } from '../stores/session-store';

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { defaultAngle, setDefaultAngle } = useSessionStore();

  return (
    <div className="py-4 space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>
      <div className="space-y-3">
        <label className="text-sm font-medium text-zinc-300">Default Filming Angle</label>
        <AngleSelector value={defaultAngle} onChange={setDefaultAngle} />
      </div>
      <div className="border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-600">Pull-Up Check v1.0.0 · All processing on-device · No data uploaded</p>
      </div>
    </div>
  );
}
