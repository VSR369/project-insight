/**
 * Industry Pulse Module Constants
 * Per Project Knowledge standards - centralized constants for gamification, content, and feed logic
 */

// =====================================================
// XP REWARDS (per gamification system spec)
// =====================================================

export const PULSE_XP_REWARDS = {
  // Content creation XP
  CONTENT_CREATED: {
    podcast: 200,
    reel: 100,
    article: 150,
    gallery: 75,
    spark: 50,
    post: 25,
  },
  // Engagement received XP (awarded to content owner)
  ENGAGEMENT_RECEIVED: {
    fire: 2,
    gold: 15,
    save: 5,
    bookmark: 0, // Private, no XP
  },
} as const;

// =====================================================
// CONTENT TYPES
// =====================================================

export const PULSE_CONTENT_TYPES = [
  'reel',
  'podcast',
  'spark',
  'article',
  'gallery',
  'post',
] as const;

export type PulseContentType = typeof PULSE_CONTENT_TYPES[number];

export const PULSE_CONTENT_TYPE_LABELS: Record<PulseContentType, string> = {
  reel: 'Reel',
  podcast: 'Podcast',
  spark: 'Knowledge Spark',
  article: 'Article',
  gallery: 'Gallery',
  post: 'Quick Post',
};

export const PULSE_CONTENT_TYPE_ICONS: Record<PulseContentType, string> = {
  reel: 'Video',
  podcast: 'Mic',
  spark: 'Zap',
  article: 'FileText',
  gallery: 'Images',
  post: 'MessageSquare',
};

// =====================================================
// CONTENT STATUS
// =====================================================

export const PULSE_CONTENT_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'archived',
  'rejected',
] as const;

export type PulseContentStatus = typeof PULSE_CONTENT_STATUSES[number];

export const PULSE_CONTENT_STATUS_LABELS: Record<PulseContentStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
  rejected: 'Rejected',
};

// =====================================================
// ENGAGEMENT TYPES
// =====================================================

export const PULSE_ENGAGEMENT_TYPES = [
  'fire',
  'gold',
  'save',
  'bookmark',
] as const;

export type PulseEngagementType = typeof PULSE_ENGAGEMENT_TYPES[number];

export const PULSE_ENGAGEMENT_LABELS: Record<PulseEngagementType, string> = {
  fire: 'Fire',
  gold: 'Gold',
  save: 'Save',
  bookmark: 'Bookmark',
};

// =====================================================
// FEED SCORING (per ranking logic spec)
// =====================================================

export const PULSE_FEED_WEIGHTS = {
  fire: 1,
  comment: 3,
  gold: 10,
  save: 5,
} as const;

export const PULSE_FEED_RECENCY_DECAY = {
  /** Hours after which decay begins */
  DECAY_START_HOURS: 6,
  /** Decay factor per hour after start */
  DECAY_RATE: 0.95,
  /** Minimum score multiplier */
  MIN_MULTIPLIER: 0.1,
} as const;

export const PULSE_VISIBILITY_BOOST = {
  /** Multiplier when visibility boost is active */
  STANDUP_MULTIPLIER: 10,
  /** Duration of boost in hours */
  BOOST_DURATION_HOURS: 24,
} as const;

// =====================================================
// STREAK MULTIPLIERS (for loot box rewards)
// =====================================================

export const PULSE_STREAK_MULTIPLIERS: Record<number, number> = {
  365: 3.0,
  180: 2.5,
  90: 2.0,
  30: 1.75,
  14: 1.5,
  7: 1.25,
  0: 1.0,
} as const;

export function getStreakMultiplier(streak: number): number {
  const thresholds = Object.keys(PULSE_STREAK_MULTIPLIERS)
    .map(Number)
    .sort((a, b) => b - a);
  
  for (const threshold of thresholds) {
    if (streak >= threshold) {
      return PULSE_STREAK_MULTIPLIERS[threshold];
    }
  }
  return 1.0;
}

// =====================================================
// LEVEL CALCULATION
// =====================================================

export function calculateLevel(totalXp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(totalXp / 20)) + 1);
}

export function xpForLevel(level: number): number {
  return 20 * Math.pow(level - 1, 2);
}

export function xpToNextLevel(totalXp: number): { current: number; required: number; progress: number } {
  const currentLevel = calculateLevel(totalXp);
  const currentLevelXp = xpForLevel(currentLevel);
  const nextLevelXp = xpForLevel(currentLevel + 1);
  const xpInCurrentLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  
  return {
    current: xpInCurrentLevel,
    required: xpNeeded,
    progress: Math.min(1, xpInCurrentLevel / xpNeeded),
  };
}

// =====================================================
// FILE UPLOAD LIMITS (per technical constraints)
// =====================================================

export const PULSE_UPLOAD_LIMITS = {
  /** Max video/audio file size in bytes (500MB) */
  VIDEO_AUDIO_MAX_BYTES: 500 * 1024 * 1024,
  /** Max gallery image size in bytes (50MB) */
  GALLERY_IMAGE_MAX_BYTES: 50 * 1024 * 1024,
  /** Max post image size in bytes (10MB) */
  POST_IMAGE_MAX_BYTES: 10 * 1024 * 1024,
  /** Max gallery images per content */
  MAX_GALLERY_IMAGES: 10,
} as const;

// =====================================================
// RATE LIMITS (per technical constraints)
// =====================================================

export const PULSE_RATE_LIMITS = {
  /** Max content creations per hour */
  CONTENT_PER_HOUR: 5,
  /** Max content creations per day */
  CONTENT_PER_DAY: 20,
  /** Max comments per hour */
  COMMENTS_PER_HOUR: 30,
  /** Max AI enhancements per day */
  AI_ENHANCEMENTS_PER_DAY: 10,
} as const;

// =====================================================
// POLLING INTERVALS (per technical constraints)
// =====================================================

export const PULSE_POLLING_INTERVALS = {
  /** Feed polling interval in ms */
  FEED_MS: 30 * 1000,
  /** Active content details polling in ms */
  ACTIVE_CONTENT_MS: 5 * 1000,
  /** Notifications polling in ms */
  NOTIFICATIONS_MS: 30 * 1000,
} as const;

// =====================================================
// NOTIFICATION TYPES
// =====================================================

export const PULSE_NOTIFICATION_TYPES = [
  'new_follower',
  'content_fire',
  'content_gold',
  'content_save',
  'content_comment',
  'comment_reply',
  'level_up',
  'streak_milestone',
  'loot_box_available',
  'content_featured',
  'verification_granted',
  'system_announcement',
] as const;

export type PulseNotificationType = typeof PULSE_NOTIFICATION_TYPES[number];

// =====================================================
// REPORT TYPES
// =====================================================

export const PULSE_REPORT_TYPES = [
  'spam',
  'harassment',
  'misinformation',
  'inappropriate_content',
  'copyright_violation',
  'other',
] as const;

export type PulseReportType = typeof PULSE_REPORT_TYPES[number];

export const PULSE_REPORT_TYPE_LABELS: Record<PulseReportType, string> = {
  spam: 'Spam',
  harassment: 'Harassment or Bullying',
  misinformation: 'Misinformation',
  inappropriate_content: 'Inappropriate Content',
  copyright_violation: 'Copyright Violation',
  other: 'Other',
};

// =====================================================
// VERIFICATION SOURCES
// =====================================================

export const PULSE_VERIFICATION_SOURCES = [
  'platform_assessment',
  'platform_interview',
  'manual_admin',
] as const;

export type PulseVerificationSource = typeof PULSE_VERIFICATION_SOURCES[number];

// =====================================================
// QUERY KEYS (for React Query cache management)
// =====================================================

export const PULSE_QUERY_KEYS = {
  feed: 'pulse-feed',
  content: 'pulse-content',
  contentDetail: 'pulse-content-detail',
  comments: 'pulse-comments',
  engagements: 'pulse-engagements',
  userEngagements: 'pulse-user-engagements',
  providerStats: 'pulse-provider-stats',
  connections: 'pulse-connections',
  followers: 'pulse-followers',
  following: 'pulse-following',
  notifications: 'pulse-notifications',
  unreadCount: 'pulse-unread-count',
  leaderboard: 'pulse-leaderboard',
  skills: 'pulse-skills',
  dailyStandup: 'pulse-daily-standup',
  lootBox: 'pulse-loot-box',
  tags: 'pulse-tags',
  trendingTags: 'pulse-trending-tags',
} as const;
