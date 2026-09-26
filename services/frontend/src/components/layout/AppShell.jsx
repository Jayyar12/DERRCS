import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import PageSkeleton from './PageSkeleton';

export function AppShell() {
  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Suspense fallback={<PageSkeleton />}>
        <div className="flex-1 flex flex-col animate-in fade-in duration-200">
          <Outlet />
        </div>
      </Suspense>
    </div>
  );
}

export default AppShell;
