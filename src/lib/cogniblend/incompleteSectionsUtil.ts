/**
 * incompleteSectionsUtil — Shared logic for building the list of incomplete
 * sections/groups, used by both IncompleteSectionsBanner and PreFlightGateDialog.
 */

import type { GroupDef, SectionDef } from '@/lib/cogniblend/curationTypes';

export interface IncompleteGroup {
  groupId: string;
  label: string;
  missing: number;
  total: number;
  sectionKeys: string[];
}

/**
 * Build a list of groups that have incomplete sections.
 */
export function buildIncompleteGroups(
  groups: GroupDef[],
  sectionMap: Map<string, SectionDef>,
  groupProgress: Record<string, { done: number; total: number }>,
): IncompleteGroup[] {
  return groups
    .map((g) => {
      const progress = groupProgress[g.id];
      if (!progress || progress.done >= progress.total) return null;
      const sectionKeys = g.sectionKeys.filter((key) => !!sectionMap.get(key));
      return {
        groupId: g.id,
        label: g.label,
        missing: progress.total - progress.done,
        total: progress.total,
        sectionKeys,
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
