/**
 * Organization Settings Service Layer (ORG-001)
 * 
 * Business logic for profile editability, tier changes, and model switching.
 * Per Project Knowledge: stateless, max ~200 lines.
 */

// ============================================================
// Profile Field Editability Rules (Section 14)
// ============================================================

/** Fields that are ALWAYS locked after registration */
const LOCKED_FIELDS = new Set([
  'legal_entity_name',
  'organization_type_id',
  'hq_country_id', // changing country cascades currency/pricing — requires special flow
  'founding_year',
]);

/** Fields editable by tenant admins */
const EDITABLE_FIELDS = new Set([
  'organization_name',
  'trade_brand_name',
  'website_url',
  'organization_description',
  'hq_address_line1',
  'hq_address_line2',
  'hq_city',
  'hq_postal_code',
  'timezone',
  'employee_count_range',
  'annual_revenue_range',
]);

export function isFieldEditable(fieldName: string): boolean {
  if (LOCKED_FIELDS.has(fieldName)) return false;
  return EDITABLE_FIELDS.has(fieldName);
}

export function getLockedFields(): string[] {
  return Array.from(LOCKED_FIELDS);
}

export function getEditableFields(): string[] {
  return Array.from(EDITABLE_FIELDS);
}

// ============================================================
// Tier Change Validation
// ============================================================

interface TierInfo {
  code: string;
  name: string;
  max_challenges: number | null;
  max_users: number | null;
}

export function determineTierChangeType(
  currentTierCode: string,
  newTierCode: string,
): 'upgrade' | 'downgrade' | 'same' {
  const TIER_ORDER: Record<string, number> = {
    basic: 1,
    standard: 2,
    premium: 3,
  };
  const currentRank = TIER_ORDER[currentTierCode] ?? 0;
  const newRank = TIER_ORDER[newTierCode] ?? 0;

  if (newRank > currentRank) return 'upgrade';
  if (newRank < currentRank) return 'downgrade';
  return 'same';
}

// ============================================================
// Engagement Model Switch Validation (BR-MSL-001)
// ============================================================

export interface ModelSwitchValidation {
  canSwitch: boolean;
  reason?: string;
  blockingChallenges?: { id: string; title: string; status: string }[];
}

export function validateModelSwitch(
  currentTierCode: string,
  activeChallenges: { id: string; title: string; status: string }[],
): ModelSwitchValidation {
  // BR-ENG-001: Only Basic tier can switch models
  if (currentTierCode !== 'basic') {
    return {
      canSwitch: false,
      reason: 'Engagement model switching is only available on the Basic tier.',
    };
  }

  // BR-MSL-001: Active challenges block model switching
  if (activeChallenges.length > 0) {
    return {
      canSwitch: false,
      reason: `Cannot switch engagement model while ${activeChallenges.length} challenge(s) are active. Complete or close them first.`,
      blockingChallenges: activeChallenges,
    };
  }

  return { canSwitch: true };
}
