/**
 * CogniShell — Persistent layout shell for all authenticated CogniBlend pages.
 * Renders sidebar, top bar, and an <Outlet /> for page content.
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
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  // Prefix match for nested routes
  const match = Object.entries(ROUTE_TITLES).find(([path]) =>
    pathname.startsWith(path + '/')
  );
  return match?.[1] ?? 'CogniBlend';
}

const ContentFallback = () => (
  <div className="p-6 space-y-4">
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
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Top bar */}
      <CogniTopBar
        pageTitle={pageTitle}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main content */}
      <main
        className="md:ml-64 mt-14 min-h-[calc(100vh-56px)]"
        style={{ backgroundColor: '#F9FAFB', padding: 24 }}
      >
        <Suspense fallback={<ContentFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
