import { BottomNav } from './BottomNav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-50 pb-24">
      <main className="mx-auto max-w-lg px-5">{children}</main>
      <BottomNav />
    </div>
  );
}
