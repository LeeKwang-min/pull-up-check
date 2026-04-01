import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Analytics } from '@vercel/analytics/react';
import { Shell } from '../components/layout/Shell';

export const Route = createRootRoute({
  component: () => (
    <Shell>
      <Outlet />
      <Analytics />
    </Shell>
  ),
});
