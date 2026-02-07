/**
 * PulsePages (Pulse Card) - Constants
 * Collaborative Knowledge System
 */

// ===========================================
// Reputation Tiers
// ===========================================
export const REPUTATION_TIERS = {
  SEEDLING: { min: 0, max: 49, name: 'Seedling', emoji: '🌱', description: 'Can view, react, comment', voteWeight: 1 },
  CONTRIBUTOR: { min: 50, max: 199, name: 'Contributor', emoji: '🌿', description: 'Can start cards', voteWeight: 1 },
  BUILDER: { min: 200, max: 499, name: 'Builder', emoji: '🌳', description: 'Can build on any card', voteWeight: 1 },
  EXPERT: { min: 500, max: 999, name: 'Expert', emoji: '🏆', description: 'Vote carries 2x weight', voteWeight: 2 },
  TRUST_COUNCIL: { min: 1000, max: Infinity, name: 'Trust Council', emoji: '👑', description: 'Moderation powers', voteWeight: 2 },
} as const;

export type ReputationTierKey = keyof typeof REPUTATION_TIERS;

// ===========================================
// Reputation Actions (Points awarded/deducted)
// ===========================================
export const REPUTATION_ACTIONS = {
  CARD_BUILD_RECEIVED: { points: 5, reason: 'Your card received a build' },
  LAYER_PINNED: { points: 20, reason: 'Your layer was featured' },
  FLAG_UPHELD: { points: 10, reason: 'Your flag was upheld' },
  CARD_SHARED: { points: 2, reason: 'Your card was shared' },
  CREDENTIAL_VERIFIED: { points: 100, reason: 'Industry credential verified' },
  FLAG_REJECTED: { points: -5, reason: 'Your flag was rejected' },
  CARD_ARCHIVED_VIOLATION: { points: -50, reason: 'Content archived for violation' },
  REPORT_UPHELD_AGAINST: { points: -25, reason: 'Report upheld against your content' },
} as const;

// ===========================================
// Reputation Gates (Min reputation required for actions)
// ===========================================
export const REPUTATION_GATES = {
  VIEW_CARDS: 0,
  REACT_COMMENT: 0,
  START_CARD: 0,  // Temporarily 0 for launch; will increase to 50 when user base grows
  BUILD_ON_CARD: 0,
  VOTE_LAYER: 0,
  FLAG_CONTENT: 10,
  TRUST_COUNCIL_ELIGIBLE: 1000,
} as const;

// ===========================================
// Card Status
// ===========================================
export const CARD_STATUS = {
  ACTIVE: 'active',
  FLAGGED: 'flagged',
  ARCHIVED: 'archived',
} as const;

export type CardStatus = typeof CARD_STATUS[keyof typeof CARD_STATUS];

// ===========================================
// Layer Status
// ===========================================
export const LAYER_STATUS = {
  ACTIVE: 'active',
  FLAGGED: 'flagged',
  ARCHIVED: 'archived',
} as const;

export type LayerStatus = typeof LAYER_STATUS[keyof typeof LAYER_STATUS];

// ===========================================
// Flag Types
// ===========================================
export const FLAG_TYPES = {
  spam: { label: 'Spam', emoji: '🚫', description: 'Promotional or irrelevant content' },
  false_claim: { label: 'False Claim', emoji: '❌', description: 'Factually incorrect information' },
  uncited: { label: 'Uncited Source', emoji: '📚', description: 'Claims without proper attribution' },
  unconstructive: { label: 'Unconstructive', emoji: '⚠️', description: 'Attacks without adding value' },
  other: { label: 'Other', emoji: '💬', description: 'Other violation not listed above' },
} as const;

export type FlagType = keyof typeof FLAG_TYPES;

// ===========================================
// Flag Status
// ===========================================
export const FLAG_STATUS = {
  PENDING: 'pending',
  UPHELD: 'upheld',
  REJECTED: 'rejected',
} as const;

export type FlagStatus = typeof FLAG_STATUS[keyof typeof FLAG_STATUS];

// ===========================================
// Moderation Action Types
// ===========================================
export const MODERATION_ACTIONS = {
  no_action: { label: 'No Action', severity: 0 },
  warning: { label: 'Warning', severity: 1 },
  mute_7d: { label: '7-Day Mute', severity: 2 },
  archive: { label: 'Archive Content', severity: 3 },
  strike: { label: 'Strike', severity: 4 },
} as const;

// ===========================================
// Vote Types
// ===========================================
export const VOTE_TYPES = {
  UP: 'up',
  DOWN: 'down',
} as const;

export type VoteType = typeof VOTE_TYPES[keyof typeof VOTE_TYPES];

// ===========================================
// Content Limits
// ===========================================
export const CARD_LIMITS = {
  MAX_CONTENT_LENGTH: 280,
  VOTING_WINDOW_HOURS: 24,
  MAX_MEDIA_SIZE_MB: 50,
  MAX_LAYERS_PER_CARD: 100,
  MAX_FLAGS_BEFORE_AUTO_HIDE: 3,
} as const;

// ===========================================
// Polling Intervals
// PERFORMANCE: Increased intervals to reduce network churn
// ===========================================
export const PULSE_CARDS_POLLING = {
  FEED_MS: 120000, // 2 minutes - feed updates don't need to be instant
  DETAIL_MS: 30000, // 30 seconds - reduce detail polling
  VOTES_MS: 30000, // 30 seconds - votes can wait
} as const;

// ===========================================
// XP Rewards (matching other content types)
// ===========================================
export const PULSE_CARD_XP_REWARDS = {
  CARD_CREATED: 75,      // Similar to gallery
  LAYER_CREATED: 25,     // Similar to post (building on card)
  ENGAGEMENT_RECEIVED: {
    fire: 2,
    gold: 15,
    save: 5,
    bookmark: 0,
  },
} as const;

// ===========================================
// Query Keys for Card Engagements
// ===========================================
export const PULSE_CARD_QUERY_KEYS = {
  cardEngagements: 'pulse-card-engagements',
  userCardEngagements: 'pulse-user-card-engagements',
} as const;

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get the reputation tier for a given total reputation score
 */
export function getReputationTier(totalRep: number): typeof REPUTATION_TIERS[ReputationTierKey] {
  if (totalRep >= REPUTATION_TIERS.TRUST_COUNCIL.min) {
    return REPUTATION_TIERS.TRUST_COUNCIL;
  }
  if (totalRep >= REPUTATION_TIERS.EXPERT.min) {
    return REPUTATION_TIERS.EXPERT;
  }
  if (totalRep >= REPUTATION_TIERS.BUILDER.min) {
    return REPUTATION_TIERS.BUILDER;
  }
  if (totalRep >= REPUTATION_TIERS.CONTRIBUTOR.min) {
    return REPUTATION_TIERS.CONTRIBUTOR;
  }
  return REPUTATION_TIERS.SEEDLING;
}

/**
 * Get vote weight based on reputation tier
 */
export function getVoteWeight(totalRep: number): number {
  const tier = getReputationTier(totalRep);
  return tier.voteWeight;
}

/**
 * Check if user can perform an action based on reputation
 */
export function canPerformAction(
  totalRep: number, 
  action: keyof typeof REPUTATION_GATES
): { allowed: boolean; requiredRep: number; currentRep: number } {
  const required = REPUTATION_GATES[action];
  return {
    allowed: totalRep >= required,
    requiredRep: required,
    currentRep: totalRep,
  };
}
