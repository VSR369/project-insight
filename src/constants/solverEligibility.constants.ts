/**
 * Solver Eligibility Constants
 * 
 * Display configuration for the 8 solver eligibility categories.
 * Used in Challenge Creation UI and eligibility enforcement.
 */

/** Solver eligibility category codes */
export const SOLVER_ELIGIBILITY_CODES = {
  CERTIFIED_BASIC: 'certified_basic',
  CERTIFIED_COMPETENT: 'certified_competent',
  CERTIFIED_EXPERT: 'certified_expert',
  REGISTERED: 'registered',
  EXPERT_INVITEE: 'expert_invitee',
  SIGNED_IN: 'signed_in',
  OPEN_COMMUNITY: 'open_community',
  HYBRID: 'hybrid',
} as const;

export type SolverEligibilityCode = typeof SOLVER_ELIGIBILITY_CODES[keyof typeof SOLVER_ELIGIBILITY_CODES];

/** Display metadata for each solver eligibility category */
export const SOLVER_ELIGIBILITY_DISPLAY: Record<string, {
  label: string;
  shortDescription: string;
  icon: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  certified_basic: {
    label: 'Certified Basic',
    shortDescription: '⭐ Basic or higher certified providers',
    icon: '⭐',
    badgeVariant: 'default',
  },
  certified_competent: {
    label: 'Certified Competent',
    shortDescription: '⭐⭐ Competent or higher certified providers',
    icon: '⭐⭐',
    badgeVariant: 'default',
  },
  certified_expert: {
    label: 'Certified Expert',
    shortDescription: '⭐⭐⭐ Expert certified providers only',
    icon: '⭐⭐⭐',
    badgeVariant: 'default',
  },
  registered: {
    label: 'Registered',
    shortDescription: 'Registered providers with basic info — no certification needed',
    icon: '📋',
    badgeVariant: 'secondary',
  },
  expert_invitee: {
    label: 'Expert (Invitee)',
    shortDescription: 'VIP Expert invitees — auto-certified',
    icon: '🎖️',
    badgeVariant: 'default',
  },
  signed_in: {
    label: 'Signed In',
    shortDescription: 'Any logged-in user — no registration needed',
    icon: '🔑',
    badgeVariant: 'secondary',
  },
  open_community: {
    label: 'Open Community',
    shortDescription: 'Anyone can participate — citizens, students, public',
    icon: '🌍',
    badgeVariant: 'outline',
  },
  hybrid: {
    label: 'Hybrid',
    shortDescription: 'Curated certified experts + open community submissions',
    icon: '🔀',
    badgeVariant: 'outline',
  },
} as const;

/** Categories that require certification */
export const CERTIFIED_ELIGIBILITY_CODES = [
  SOLVER_ELIGIBILITY_CODES.CERTIFIED_BASIC,
  SOLVER_ELIGIBILITY_CODES.CERTIFIED_COMPETENT,
  SOLVER_ELIGIBILITY_CODES.CERTIFIED_EXPERT,
] as const;

/** Categories that allow anonymous (unauthenticated) participation */
export const ANONYMOUS_ELIGIBILITY_CODES = [
  SOLVER_ELIGIBILITY_CODES.OPEN_COMMUNITY,
  SOLVER_ELIGIBILITY_CODES.HYBRID,
] as const;

/** Challenge submission statuses */
export const SUBMISSION_STATUSES = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const;

/** Prize statuses */
export const PRIZE_STATUSES = {
  PENDING: 'pending',
  AWARDED: 'awarded',
  DISPATCHED: 'dispatched',
  NOT_APPLICABLE: 'not_applicable',
} as const;
