import { BottomNav } from './BottomNav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 pb-24">
      <main className="mx-auto max-w-lg px-5">{children}</main>
      <BottomNav />
    </div>
  );
}
