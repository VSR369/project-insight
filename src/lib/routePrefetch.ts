/**
 * Route Prefetch Utility
 * 
 * Maps admin sidebar paths to their dynamic import functions.
 * Calling prefetchRoute(path) triggers the browser to download and cache
 * the JS chunk, so subsequent navigation is near-instant.
 */

const ADMIN_ROUTE_IMPORTS: Record<string, () => Promise<any>> = {
  // Master Data
  '/admin/master-data/countries': () => import('@/pages/admin/countries'),
  '/admin/master-data/industry-segments': () => import('@/pages/admin/industry-segments'),
  '/admin/master-data/organization-types': () => import('@/pages/admin/organization-types'),
  '/admin/master-data/participation-modes': () => import('@/pages/admin/participation-modes'),
  '/admin/master-data/expertise-levels': () => import('@/pages/admin/expertise-levels'),
  '/admin/master-data/functional-areas': () => import('@/pages/admin/functional-areas'),

  // Taxonomy
  '/admin/master-data/academic-taxonomy': () => import('@/pages/admin/academic-taxonomy'),
  '/admin/master-data/proficiency-taxonomy': () => import('@/pages/admin/proficiency-taxonomy'),

  // Interview Setup
  '/admin/interview/kit': () => import('@/pages/admin/interview-kit'),
  '/admin/interview/quorum-requirements': () => import('@/pages/admin/interview-requirements'),
  '/admin/interview/reviewer-availability': () => import('@/pages/admin/reviewer-availability'),
  '/admin/reviewer-approvals': () => import('@/pages/admin/reviewer-approvals'),

  // Seeker Management
  '/admin/saas-agreements': () => import('@/pages/admin/SaasAgreementPage'),

  // Seeker Config
  '/admin/seeker-config/pricing-overview': () => import('@/pages/admin/pricing-overview'),
  '/admin/seeker-config/subscription-tiers': () => import('@/pages/admin/subscription-tiers'),
  '/admin/seeker-config/membership-tiers': () => import('@/pages/admin/membership-tiers'),
  '/admin/seeker-config/engagement-models': () => import('@/pages/admin/engagement-models'),
  '/admin/seeker-config/challenge-complexity': () => import('@/pages/admin/challenge-complexity'),
  '/admin/seeker-config/base-fees': () => import('@/pages/admin/base-fees'),
  '/admin/seeker-config/platform-fees': () => import('@/pages/admin/platform-fees'),
  '/admin/seeker-config/shadow-pricing': () => import('@/pages/admin/shadow-pricing'),
  '/admin/seeker-config/challenge-statuses': () => import('@/pages/admin/challenge-statuses'),
  '/admin/seeker-config/export-control': () => import('@/pages/admin/export-control'),
  '/admin/seeker-config/data-residency': () => import('@/pages/admin/data-residency'),
  '/admin/seeker-config/blocked-domains': () => import('@/pages/admin/blocked-domains'),
  '/admin/seeker-config/platform-terms': () => import('@/pages/admin/platform-terms'),

  // Other
  '/admin/questions': () => import('@/pages/admin/question-bank'),
  '/admin/capability-tags': () => import('@/pages/admin/capability-tags'),
  '/admin/invitations': () => import('@/pages/admin/invitations'),
  '/admin/invitations/panel-reviewers': () => import('@/pages/admin/invitations'),
  '/admin/regression-test-kit': () => import('@/pages/admin/RegressionTestKitPage'),
  '/admin/pulse-social-test': () => import('@/pages/admin/PulseSocialTestPage'),
  '/admin/smoke-test': () => import('@/pages/admin/SmokeTestPage'),
  '/admin/settings': () => import('@/pages/admin/MasterDataPlaceholder'),
};

// Track already-prefetched paths to avoid duplicate fetches
const prefetched = new Set<string>();

/**
 * Prefetch a single route's JS chunk. Safe to call multiple times —
 * subsequent calls for the same path are no-ops.
 */
export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const loader = ADMIN_ROUTE_IMPORTS[path];
  if (loader) {
    prefetched.add(path);
    loader().catch(() => {
      // Remove from set so it can be retried
      prefetched.delete(path);
    });
  }
}

/**
 * Prefetch the most commonly accessed admin routes during browser idle time.
 * Called once when AdminSidebar mounts.
 */
export function prefetchAdminRoutes(): void {
  const topRoutes = [
    '/admin/master-data/countries',
    '/admin/master-data/industry-segments',
    '/admin/master-data/organization-types',
    '/admin/master-data/expertise-levels',
    '/admin/seeker-config/pricing-overview',
    '/admin/seeker-config/subscription-tiers',
  ];

  const prefetchBatch = () => {
    topRoutes.forEach(path => prefetchRoute(path));
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(prefetchBatch);
  } else {
    setTimeout(prefetchBatch, 200);
  }
}
