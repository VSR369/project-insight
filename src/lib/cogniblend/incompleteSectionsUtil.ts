/**
 * incompleteSectionsUtil — Shared logic for building the list of incomplete
 * sections/groups, used by both IncompleteSectionsBanner and PreFlightGateDialog.
 */

import type {
  GroupDef,
  SectionDef,
  ChallengeData,
  LegalDocSummary,
  LegalDocDetail,
  EscrowRecord,
} from '@/lib/cogniblend/curationTypes';

export interface IncompleteGroup {
  groupId: string;
  label: string;
  missing: number;
  total: number;
  sectionKeys: string[];
  /** Only the section keys that are genuinely incomplete */
  incompleteSectionKeys: string[];
}

/**
 * Build a list of groups that have incomplete sections.
 *
 * When `challenge` is provided, uses `sec.isFilled()` for per-section granularity.
 * Falls back to groupProgress math when challenge is null.
 */
export function buildIncompleteGroups(
  groups: GroupDef[],
  sectionMap: Map<string, SectionDef>,
  groupProgress: Record<string, { done: number; total: number }>,
  challenge?: ChallengeData | null,
  legalDocs?: LegalDocSummary[],
  legalDetails?: LegalDocDetail[],
  escrowRecord?: EscrowRecord | null,
): IncompleteGroup[] {
  return groups
    .map((g) => {
      const progress = groupProgress[g.id];
      if (!progress || progress.done >= progress.total) return null;

      const validKeys = g.sectionKeys.filter((key) => !!sectionMap.get(key));

      let incompleteSectionKeys: string[];

      if (challenge) {
        incompleteSectionKeys = validKeys.filter((key) => {
          const sec = sectionMap.get(key);
          if (!sec?.isFilled) return true;
          return !sec.isFilled(challenge, legalDocs ?? [], legalDetails ?? [], escrowRecord ?? null);
        });
      } else {
        // Fallback: treat all valid keys as incomplete (can't evaluate without challenge)
        incompleteSectionKeys = validKeys;
      }

      if (incompleteSectionKeys.length === 0) return null;

      return {
        groupId: g.id,
        label: g.label,
        missing: incompleteSectionKeys.length,
        total: progress.total,
        sectionKeys: validKeys,
        incompleteSectionKeys,
      };
    })
    .filter((g): g is IncompleteGroup => g !== null);
}

/**
 * Total count of missing sections across all groups.
 */
export function countTotalMissing(groups: IncompleteGroup[]): number {
  return groups.reduce((sum, g) => sum + g.missing, 0);
}
