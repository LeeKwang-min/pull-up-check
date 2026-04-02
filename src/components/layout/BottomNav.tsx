import { Link, useRouterState } from '@tanstack/react-router';

const navItems = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/analyze', label: '분석', icon: 'analyze' },
  { to: '/history', label: '기록', icon: 'history' },
  { to: '/settings', label: '설정', icon: 'settings' },
] as const;

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? '#D97706' : '#A8A29E';
  const sw = active ? '2.2' : '1.8';
  switch (name) {
    case 'home':
      return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
    case 'analyze':
      return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'history':
      return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>;
    case 'settings':
      return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    default:
      return null;
  }
}

export function BottomNav() {
  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white/90 backdrop-blur-2xl border-t border-stone-200">
        <div className="mx-auto max-w-lg flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = item.to === '/' ? currentPath === '/' : currentPath.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className="relative flex flex-col items-center gap-1 py-2 px-4 cursor-pointer"
              >
                <NavIcon name={item.icon} active={isActive} />
                <span className={`text-[10px] font-medium tracking-wide transition-colors ${isActive ? 'text-amber-600' : 'text-stone-400'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-amber-500" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
