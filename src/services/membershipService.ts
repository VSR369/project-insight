/**
 * Membership & SaaS Service Layer (MEM-001 / SAS-001)
 *
 * Business logic for membership discounts, auto-renewal, and SaaS fee management.
 * Per Project Knowledge: stateless, max ~200 lines.
 */

// ============================================================
// Membership Discount Rules (BR-MEM-001 through BR-MEM-004)
// ============================================================

export interface MembershipDiscountResult {
  feeDiscountPct: number;
  commissionRatePct: number;
  isEligible: boolean;
  reason?: string;
}

/**
 * BR-MEM-001: Membership discounts are determined by membership tier.
 * BR-MEM-003: Internal departments bypass membership requirements.
 */
export function calculateMembershipDiscount(
  membershipTierCode: string | null,
  isInternalDepartment: boolean,
): MembershipDiscountResult {
  // BR-MEM-003: Internal departments get zero-fee, no membership needed
  if (isInternalDepartment) {
    return {
      feeDiscountPct: 100,
      commissionRatePct: 0,
      isEligible: true,
      reason: 'Internal department — zero-fee bypass',
    };
  }

  if (!membershipTierCode) {
    return {
      feeDiscountPct: 0,
      commissionRatePct: 0,
      isEligible: false,
      reason: 'No active membership',
    };
  }

  // Discount rates by tier (from md_membership_tiers seed data)
  const TIER_DISCOUNTS: Record<string, { fee: number; commission: number }> = {
    annual: { fee: 10, commission: 5 },
    multi_year: { fee: 20, commission: 10 },
  };

  const discount = TIER_DISCOUNTS[membershipTierCode];
  if (!discount) {
    return {
      feeDiscountPct: 0,
      commissionRatePct: 0,
      isEligible: false,
      reason: `Unknown membership tier: ${membershipTierCode}`,
    };
  }

  return {
    feeDiscountPct: discount.fee,
    commissionRatePct: discount.commission,
    isEligible: true,
  };
}

// ============================================================
// Membership Renewal Validation (BR-MEM-002)
// ============================================================

export interface RenewalValidation {
  canRenew: boolean;
  reason?: string;
  daysUntilExpiry: number;
}

export function validateMembershipRenewal(
  expiryDate: string | null,
  lifecycleStatus: string,
): RenewalValidation {
  if (lifecycleStatus === 'cancelled') {
    return { canRenew: false, reason: 'Membership was cancelled', daysUntilExpiry: 0 };
  }

  if (lifecycleStatus === 'suspended') {
    return { canRenew: false, reason: 'Membership is suspended — contact support', daysUntilExpiry: 0 };
  }

  if (!expiryDate) {
    return { canRenew: true, daysUntilExpiry: Infinity };
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // BR-MEM-002: Allow renewal within 30 days of expiry
  if (daysUntilExpiry > 30) {
    return {
      canRenew: false,
      reason: `Renewal available within 30 days of expiry (${daysUntilExpiry} days remaining)`,
      daysUntilExpiry,
    };
  }

  return { canRenew: true, daysUntilExpiry };
}

// ============================================================
// SaaS Agreement Validation (BR-SFC-001 through BR-SFC-003)
// ============================================================

export interface SaasAgreementValidation {
  isValid: boolean;
  errors: string[];
}

export function validateSaasAgreement(params: {
  feeAmount: number;
  feeCurrency: string;
  parentOrgId: string;
  childOrgId: string;
}): SaasAgreementValidation {
  const errors: string[] = [];

  if (params.parentOrgId === params.childOrgId) {
    errors.push('Parent and child organization cannot be the same');
  }

  if (params.feeAmount < 0) {
    errors.push('Fee amount cannot be negative');
  }

  if (!params.feeCurrency || params.feeCurrency.length !== 3) {
    errors.push('Valid 3-letter currency code is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================
// SaaS Dashboard Metrics Computation
// ============================================================

export interface ParentDashboardMetrics {
  totalDepartments: number;
  activeDepartments: number;
  totalShadowCharges: number;
  totalChallenges: number;
  upcomingRenewals: number;
}

export function computeParentDashboardMetrics(
  agreements: Array<{ lifecycle_status: string; fee_amount: number }>,
  challengeCount: number,
  renewalCount: number,
): ParentDashboardMetrics {
  const activeDepts = agreements.filter(a => a.lifecycle_status === 'active').length;
  const totalShadow = agreements
    .filter(a => a.lifecycle_status === 'active')
    .reduce((sum, a) => sum + Number(a.fee_amount), 0);

  return {
    totalDepartments: agreements.length,
    activeDepartments: activeDepts,
    totalShadowCharges: totalShadow,
    totalChallenges: challengeCount,
    upcomingRenewals: renewalCount,
  };
}
