/**
 * Solver Routing Constants
 *
 * Single source of truth for solver-audience and visibility labels used by:
 * - QuickPublishConfirmModal
 * - QuickPublishSuccessScreen
 * - AccessModelSummary
 *
 * R10: no magic strings in components.
 */

export const SOLVER_AUDIENCE_VALUES = ['ALL', 'INTERNAL', 'EXTERNAL'] as const;
export type SolverAudience = (typeof SOLVER_AUDIENCE_VALUES)[number];

export type EngagementCode = 'MP' | 'AGG';

/**
 * Audience descriptions shown in the publish-confirmation modal and the
 * post-publish success screen.
 *
 * MP: solver_audience is forced to 'ALL' — only one label is meaningful.
 * AGG: creator chooses ALL / INTERNAL / EXTERNAL.
 */
export const SOLVER_AUDIENCE_LABELS: Record<EngagementCode, Record<SolverAudience, string>> = {
  MP: {
    ALL: 'All Solution Providers on the platform.',
    INTERNAL: 'All Solution Providers on the platform.',
    EXTERNAL: 'All Solution Providers on the platform.',
  },
  AGG: {
    ALL: 'All Solution Providers (Internal + External).',
    INTERNAL: 'Solution Providers from your organization only.',
    EXTERNAL: 'External Solution Providers only.',
  },
};

/** Visibility scope labels — shared by modal, success screen, and AccessModelSummary. */
export const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: 'Public — listed in the Solution Provider browse view.',
  PRIVATE: 'Private — discoverable only via direct invitation.',
  INVITE_ONLY: 'Invite-only — restricted to invited Solution Providers.',
  CERTIFIED_ONLY: 'Certified Solution Providers only.',
  STAR_GATED: 'Star-rated Solution Providers only.',
};

/** Human-readable engagement model name. */
export const ENGAGEMENT_LABELS: Record<EngagementCode, string> = {
  MP: 'Marketplace',
  AGG: 'Aggregator',
};

/** Notification cadence copy — same for every QUICK publish today. */
export const NOTIFICATION_CADENCE_COPY = {
  certified: 'Certified Solution Providers — immediate alert.',
  standard: 'Standard Solution Providers — 48-hour delayed alert.',
} as const;
