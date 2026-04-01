import { Link, useRouterState } from '@tanstack/react-router';

const navItems = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/analyze', label: 'Analyze', icon: '◎' },
  { to: '/history', label: 'History', icon: '☰' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
] as const;

export function BottomNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive =
            item.to === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                isActive ? 'text-blue-400' : 'text-zinc-500'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
