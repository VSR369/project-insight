/**
 * Industry Segment provenance labels — describe how the current segment value
 * was resolved on a challenge. Used for badges/subtitles across Creator and
 * Curator surfaces so terminology stays consistent.
 */

export type IndustrySegmentSource =
  | 'draft'
  | 'org_default'
  | 'creator_override'
  | 'curator_override'
  | 'fallback';

export const INDUSTRY_SOURCE_LABEL: Record<IndustrySegmentSource, string> = {
  draft: 'from Draft',
  org_default: 'Org default',
  creator_override: 'Creator set',
  curator_override: 'Curator set',
  fallback: 'Auto-selected',
};

export const INDUSTRY_SOURCE_HINT: Partial<Record<IndustrySegmentSource, string>> = {
  org_default: "Defaulted from your organization's primary industry — change if needed.",
  fallback: 'Auto-selected — please confirm or change.',
  draft: 'Loaded from your saved draft.',
};
