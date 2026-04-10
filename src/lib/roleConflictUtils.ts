/**
 * convergenceUtils — Utility functions for role convergence matrix.
 */

import { ROLE_PRIORITY } from '@/types/cogniRoles';

/**
 * Count HARD_BLOCK pairs in a conflict map.
 */
export function countBlocks(
  conflicts: Record<string, Record<string, string>>,
): number {
  let count = 0;
  const roles = ROLE_PRIORITY;
  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      if (conflicts[roles[i]]?.[roles[j]] === 'HARD_BLOCK') {
        count++;
      }
    }
  }
  return count;
}

/**
 * Derive minimum team size from conflict matrix.
 * Uses a greedy approach: group roles that can co-exist.
 */
export function deriveMinTeamSize(
  conflicts: Record<string, Record<string, string>>,
): number {
  const roles = [...ROLE_PRIORITY];
  const groups: string[][] = [];

  for (const role of roles) {
    let placed = false;
    for (const group of groups) {
      const canJoin = group.every(
        (existing) => conflicts[existing]?.[role] !== 'HARD_BLOCK' && conflicts[role]?.[existing] !== 'HARD_BLOCK',
      );
      if (canJoin) {
        group.push(role);
        placed = true;
        break;
      }
    }
    if (!placed) {
      groups.push([role]);
    }
  }

  return groups.length;
}
