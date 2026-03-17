/**
 * CogniShell — Persistent layout shell for all authenticated CogniBlend pages.
 * Renders sidebar, top bar, and an <Outlet /> for page content.
 *
 * Responsive margins:
 *   Mobile (<768px): no left margin (sidebar overlay)
 *   Tablet (768–1024px): ml-16 (icon sidebar)
 *   Desktop (≥1024px): ml-64 (full sidebar)
 */

import { Suspense, useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { CogniSidebar } from './CogniSidebar';
import { CogniTopBar } from './CogniTopBar';

/** Map pathname → display title */
const ROUTE_TITLES: Record<string, string> = {
  '/cogni/dashboard': 'Dashboard',
  '/cogni/curation': 'Curation Queue',
  '/cogni/challenges': 'Challenges',
  '/cogni/analytics': 'Analytics',
  '/cogni/settings': 'Settings',
  '/cogni/team': 'Team',
  '/cogni/knowledge': 'Knowledge Centre',
};

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  const match = Object.entries(ROUTE_TITLES).find(([path]) =>
    pathname.startsWith(path + '/')
  );
  return match?.[1] ?? 'CogniBlend';
}

const ContentFallback = () => (
  <div className="p-4 lg:p-6 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-32" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export function CogniShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <CogniSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Top bar */}
      <CogniTopBar
        pageTitle={pageTitle}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main content — responsive left margin */}
      <main
        className="mt-14 min-h-[calc(100vh-56px)] md:ml-16 lg:ml-64 p-4 lg:p-6"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <Suspense fallback={<ContentFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
