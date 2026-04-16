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

export type AiActionType = 'review' | 'generate' | 'skip' | null;

/** Allowed sources for an AI-generated finding's evidence. */
export type AiCommentEvidenceSource =
  | 'challenge_content'
  | 'industry_pack'
  | 'geography_pack'
  | 'geo_pack'
  | 'framework_library'
  | 'context_digest'
  | 'attachment'
  | 'inference'
  | 'general_knowledge'
  | 'domain_expertise'
  | 'unknown';

/** Severity / nature of an AI comment. */
export type AiCommentType = 'error' | 'warning' | 'suggestion' | 'info' | 'inferred';

/**
 * Structured AI comment produced by Pass 1 (Analyse).
 * Principal-grade fields (quantification, framework_applied, evidence_source,
 * cross_reference_verified) are nullable to remain backward-compatible with
 * older review payloads stored before the schema upgrade.
 */
export interface AiComment {
  /** Human-readable finding text. */
  text: string;
  /** Severity / nature classification. */
  type?: AiCommentType;
  /** Specific field this comment targets (when applicable). */
  field?: string | null;
  /** Why the AI flagged this (chain-of-thought summary). */
  reasoning?: string | null;
  /** AI confidence — numeric 0..1 OR qualitative ('high'|'medium'|'low'). */
  confidence?: number | 'high' | 'medium' | 'low' | null;
  /** Snippet or quote anchoring the finding. */
  evidence_basis?: string | null;
  /** Numbers, percentages, units quoted to ground the finding. */
  quantification?: string | null;
  /** Named methodology applied (e.g. SCQA, MoSCoW, RACI). */
  framework_applied?: string | null;
  /** Where the evidence came from. */
  evidence_source?: AiCommentEvidenceSource | null;
  /** Other section keys the AI cross-checked. */
  cross_reference_verified?: string[] | null;
  /** Origin of the comment ('pass1', 'consistency', 'ambiguity', etc.). */
  source?: string | null;
  /**
   * Principal-grade classification (computed server-side, not model-emitted).
   * 'principal' = substantive comment cites ≥2 forcing fields.
   * 'junior' = substantive comment with 0–1 forcing fields.
   * null/undefined = not classified (e.g. strength/best_practice or legacy).
   */
  principal_grade?: 'principal' | 'junior' | null;
}

export interface SectionStoreEntry {
  /** Section data — shape varies by section type */
  data: Record<string, unknown> | string | string[] | null;
  /**
   * AI review comments — null means no review or cleared after accept.
   * Accepts legacy `string[]` payloads and lightly-typed `{text,...}` objects
   * for backward compatibility; new code should produce `AiComment[]`.
   * Consumers must narrow before reading nested fields.
   */
  aiComments: ReadonlyArray<AiComment | string | { text: string; [k: string]: unknown }> | null;
  /** AI-suggested replacement data — null means no suggestion pending */
  aiSuggestion: Record<string, unknown> | string | string[] | null;
  /** Current review lifecycle status */
  reviewStatus: ReviewStatus;
  /** Whether AI suggestions have been addressed (accepted or rejected) */
  addressed: boolean;
  /** Post-LLM validation results (null = no validation run) */
  validationResult: ValidationResult | null;
  /** What the wave executor did for this section (null = no wave run yet) */
  aiAction: AiActionType;

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
    validationResult: null,
    aiAction: null,
    lastEditedAt: null,
    lastReviewedAt: null,
    isStale: false,
    staleBecauseOf: [],
    staleAt: null,
  };
}
