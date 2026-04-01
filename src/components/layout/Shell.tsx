import { BottomNav } from './BottomNav';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <main className="mx-auto max-w-lg px-4">{children}</main>
      <BottomNav />
    </div>
  );
}
