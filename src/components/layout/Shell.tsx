import { BottomNav } from './BottomNav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-50 pb-20">
      <main className="mx-auto max-w-lg px-4">{children}</main>
      <BottomNav />
    </div>
  );
}
