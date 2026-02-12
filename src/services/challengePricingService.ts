/**
 * Challenge Pricing Service
 * Business logic for challenge fee calculation, complexity pricing, and model rules.
 */

interface BaseFees {
  consultingBaseFee: number;
  managementBaseFee: number;
  currencyCode: string;
}

interface ComplexityMultipliers {
  consultingFeeMultiplier: number;
  managementFeeMultiplier: number;
}

interface ChallengePricing {
  consultingFee: number;
  managementFee: number;
  totalFee: number;
  currencyCode: string;
}

/**
 * BR-TFR-001/002: Calculate challenge fees based on base fees × complexity
 */
export function calculateChallengeFees(
  baseFees: BaseFees,
  complexity: ComplexityMultipliers
): ChallengePricing {
  const consultingFee = Math.round(baseFees.consultingBaseFee * complexity.consultingFeeMultiplier * 100) / 100;
  const managementFee = Math.round(baseFees.managementBaseFee * complexity.managementFeeMultiplier * 100) / 100;

  return {
    consultingFee,
    managementFee,
    totalFee: Math.round((consultingFee + managementFee) * 100) / 100,
    currencyCode: baseFees.currencyCode,
  };
}

/**
 * BR-TFR-003: Validate challenge creation against tier limits
 */
export function validateChallengeLimit(
  challengesUsed: number,
  challengeLimit: number | null
): { canCreate: boolean; remaining: number | null; reason?: string } {
  if (challengeLimit === null) {
    return { canCreate: true, remaining: null };
  }

  const remaining = challengeLimit - challengesUsed;
  if (remaining <= 0) {
    return {
      canCreate: false,
      remaining: 0,
      reason: `Challenge limit reached (${challengeLimit}). Purchase a top-up or upgrade your plan.`,
    };
  }

  return { canCreate: true, remaining };
}

/**
 * BR-TFR-004: Get max solutions allowed per complexity
 */
export function getMaxSolutions(complexityLevel: number): number {
  switch (complexityLevel) {
    case 1: return 3;  // Simple
    case 2: return 5;  // Moderate
    case 3: return 10; // Complex
    default: return 3;
  }
}

/**
 * BR-MSL-002: Check if engagement model can be changed
 */
export function canChangeEngagementModel(challengeStatus: string): boolean {
  return challengeStatus === 'draft';
}

/**
 * BR-ZFE-001: Calculate shadow fee for internal departments
 */
export function calculateShadowFee(
  shadowChargePerChallenge: number | null
): number {
  return shadowChargePerChallenge ?? 0;
}

// ============================================================
// Membership Discount Application (BR-MEM-001)
// ============================================================

export interface DiscountedPricing extends ChallengePricing {
  discountPct: number;
  discountedConsultingFee: number;
  discountedManagementFee: number;
  discountedTotalFee: number;
  hasDiscount: boolean;
}

/**
 * Apply membership discount to calculated challenge fees.
 * Returns both original and discounted amounts for display.
 */
export function applyMembershipDiscount(
  pricing: ChallengePricing,
  feeDiscountPct: number
): DiscountedPricing {
  if (feeDiscountPct <= 0) {
    return {
      ...pricing,
      discountPct: 0,
      discountedConsultingFee: pricing.consultingFee,
      discountedManagementFee: pricing.managementFee,
      discountedTotalFee: pricing.totalFee,
      hasDiscount: false,
    };
  }

  const multiplier = 1 - feeDiscountPct / 100;
  const discountedConsultingFee = Math.round(pricing.consultingFee * multiplier * 100) / 100;
  const discountedManagementFee = Math.round(pricing.managementFee * multiplier * 100) / 100;

  return {
    ...pricing,
    discountPct: feeDiscountPct,
    discountedConsultingFee,
    discountedManagementFee,
    discountedTotalFee: Math.round((discountedConsultingFee + discountedManagementFee) * 100) / 100,
    hasDiscount: true,
  };
}
