/**
 * Registration Service Layer
 * 
 * Stateless business logic for the Seeker Registration flow.
 * Per Project Knowledge: services are stateless, max ~200 lines.
 */

import { supabase } from '@/integrations/supabase/client';
import { STARTUP_CONFIG } from '@/config/registration';
import type { OrgTypeFlags } from '@/types/registration';

// ============================================================
// Duplicate Detection (BR-REG-007)
// ============================================================
export async function checkDuplicateOrganization(
  legalEntityName: string,
  hqCountryId: string,
): Promise<{ exists: boolean; orgName?: string }> {
  const { data, error } = await supabase
    .from('seeker_organizations')
    .select('id, legal_entity_name')
    .ilike('legal_entity_name', legalEntityName.trim())
    .eq('hq_country_id', hqCountryId)
    .eq('is_deleted', false)
    .limit(1);

  if (error) throw new Error(error.message);
  if (data && data.length > 0) {
    return { exists: true, orgName: data[0].legal_entity_name ?? undefined };
  }
  return { exists: false };
}

// ============================================================
// Country Pricing Validation (BR-TCP-001)
// ============================================================
export async function validateCountryPricing(countryId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('md_tier_country_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('country_id', countryId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

// ============================================================
// Org Type Flags Derivation (BR-REG-002)
// ============================================================
export async function deriveOrgTypeFlags(orgTypeId: string): Promise<OrgTypeFlags> {
  // Get the org type rule
  const { data, error } = await supabase
    .from('org_type_seeker_rules')
    .select('subsidized_eligible, compliance_required, zero_fee_eligible, startup_eligible, tier_recommendation')
    .eq('org_type_id', orgTypeId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    return {
      subsidized_eligible: false,
      compliance_required: false,
      zero_fee_eligible: false,
      startup_eligible: false,
      verification_required: false,
    };
  }

  // Verification required if subsidized eligible (NGO/Academic orgs)
  const verificationRequired = data.subsidized_eligible ?? false;

  return {
    subsidized_eligible: data.subsidized_eligible ?? false,
    compliance_required: data.compliance_required ?? false,
    zero_fee_eligible: data.zero_fee_eligible ?? false,
    startup_eligible: data.startup_eligible ?? false,
    verification_required: verificationRequired,
    tier_recommendation: data.tier_recommendation ?? undefined,
  };
}

// ============================================================
// Startup Eligibility Check (BR-REG-002)
// ============================================================
export function isStartupEligible(
  yearFounded: number,
  companySizeRange: string,
): boolean {
  const currentYear = new Date().getFullYear();
  const yearsSinceFounded = currentYear - yearFounded;

  return (
    yearsSinceFounded < STARTUP_CONFIG.MAX_YEARS_SINCE_FOUNDED &&
    STARTUP_CONFIG.ELIGIBLE_SIZE_RANGES.includes(companySizeRange)
  );
}

// ============================================================
// Subsidized Pricing Lookup (BR-SUB-001)
// ============================================================
export async function getSubsidizedPricing(orgTypeId: string): Promise<{
  discount_pct: number;
} | null> {
  // First get the rule ID for this org type
  const { data: rule, error: ruleError } = await supabase
    .from('org_type_seeker_rules')
    .select('id')
    .eq('org_type_id', orgTypeId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (ruleError) throw new Error(ruleError.message);
  if (!rule) return null;

  const { data, error } = await supabase
    .from('md_subsidized_pricing')
    .select('discount_percentage')
    .eq('org_type_rule_id', rule.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    discount_pct: Number(data.discount_percentage),
  };
}

// ============================================================
// Storage Path Generation
// ============================================================
export function generateStoragePath(
  tenantId: string,
  documentType: 'logo' | 'profile' | 'verification',
  fileName: string,
): string {
  const uuid = crypto.randomUUID();
  return `${tenantId}/${documentType}/${uuid}_${fileName}`;
}
