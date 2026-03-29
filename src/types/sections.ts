/**
 * Section type definitions and authoritative key enum.
 *
 * All section keys are derived from SECTION_FORMAT_CONFIG — the single source of truth.
 * Using SectionKey instead of raw strings makes key typos a compile error.
 */

import { SECTION_FORMAT_CONFIG } from '@/lib/cogniblend/curationSectionFormats';
import type { ValidationResult } from '@/lib/cogniblend/postLlmValidation';

/* ── Authoritative section key enum ── */

export const SECTION_KEYS = Object.keys(SECTION_FORMAT_CONFIG) as readonly (keyof typeof SECTION_FORMAT_CONFIG)[];

export type SectionKey = keyof typeof SECTION_FORMAT_CONFIG;

/* ── Per-section store state ── */

export type ReviewStatus = 'idle' | 'pending' | 'reviewed' | 'error';

export interface SectionStoreEntry {
  /** Section data — shape varies by section type */
  data: Record<string, unknown> | string | string[] | null;
  /** AI review comments — null means no review or cleared after accept */
  aiComments: string[] | null;
  /** AI-suggested replacement data — null means no suggestion pending */
  aiSuggestion: Record<string, unknown> | null;
  /** Current review lifecycle status */
  reviewStatus: ReviewStatus;
  /** Whether AI suggestions have been addressed (accepted or rejected) */
  addressed: boolean;

  /* ── Staleness tracking (Phase 3) ── */

  /** ISO timestamp — updated on every save */
  lastEditedAt: string | null;
  /** ISO timestamp — updated after AI review completes */
  lastReviewedAt: string | null;
  /** true when an upstream dependency changed after lastReviewedAt */
  isStale: boolean;
  /** Section keys that caused staleness (can be multiple) */
  staleBecauseOf: string[];
  /** When it became stale (for display: "stale since 10 min ago") */
  staleAt: string | null;
}

/* ── Reward Structure data shape ── */

export interface RewardTierData {
  enabled: boolean;
  amount: number;
}

export interface NonMonetaryItemData {
  id: string;
  label: string;
  description: string;
}

export interface RewardStructureSectionData {
  rewardType: 'monetary' | 'non_monetary' | 'both';
  currency: string;
  monetary: {
    platinum: RewardTierData;
    gold: RewardTierData;
    silver: RewardTierData;
  };
  nonMonetary: {
    items: NonMonetaryItemData[];
  };
}

/* ── Helper: create empty section store entry ── */

export function createEmptySectionEntry(): SectionStoreEntry {
  return {
    data: null,
    aiComments: null,
    aiSuggestion: null,
    reviewStatus: 'idle',
    addressed: false,
    lastEditedAt: null,
    lastReviewedAt: null,
    isStale: false,
    staleBecauseOf: [],
    staleAt: null,
  };
}
