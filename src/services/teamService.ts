/**
 * Team Management Service
 * Business logic for org user management, role assignment, and tier-based limits.
 */

interface TierLimits {
  maxUsers: number | null;
  maxChallenges: number | null;
  isEnterprise: boolean;
}

interface TeamValidationResult {
  canInvite: boolean;
  currentCount: number;
  maxAllowed: number | null;
  reason?: string;
}

/**
 * BR-REG-017: Validate user invite against tier limits
 */
export function validateUserInvite(
  currentUserCount: number,
  tierLimits: TierLimits
): TeamValidationResult {
  // Premium/Enterprise: unlimited users
  if (tierLimits.isEnterprise || tierLimits.maxUsers === null) {
    return { canInvite: true, currentCount: currentUserCount, maxAllowed: null };
  }

  const canInvite = currentUserCount < tierLimits.maxUsers;
  return {
    canInvite,
    currentCount: currentUserCount,
    maxAllowed: tierLimits.maxUsers,
    reason: canInvite
      ? undefined
      : `User limit reached (${tierLimits.maxUsers}). Upgrade your plan to add more team members.`,
  };
}

/**
 * System role definitions for seeding per-org
 */
export const SYSTEM_ROLES = [
  { code: 'owner', name: 'Owner', description: 'Full access to organization', permissions: { all: true } },
  { code: 'admin', name: 'Admin', description: 'Manage team, challenges, and billing', permissions: { team: true, challenges: true, billing: true, settings: true } },
  { code: 'manager', name: 'Manager', description: 'Create and manage challenges', permissions: { challenges: true } },
  { code: 'member', name: 'Member', description: 'View challenges and participate', permissions: { challenges_view: true } },
  { code: 'viewer', name: 'Viewer', description: 'Read-only access', permissions: { view_only: true } },
] as const;

/**
 * Check if a role code allows custom role creation (Premium only)
 */
export function canCreateCustomRoles(tierCode: string): boolean {
  return tierCode === 'premium';
}

/**
 * Validate role permissions structure
 */
export function validatePermissions(permissions: Record<string, boolean>): boolean {
  const validKeys = ['all', 'team', 'challenges', 'billing', 'settings', 'challenges_view', 'view_only'];
  return Object.keys(permissions).every(key => validKeys.includes(key));
}
