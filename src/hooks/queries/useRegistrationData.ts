/**
 * Registration Data Hooks (REG-001)
 * 
 * React Query hooks for fetching master data needed during registration.
 * Separate from useMasterData.ts to keep registration-specific logic isolated.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  checkDuplicateOrganization,
  deriveOrgTypeFlags,
  validateCountryPricing,
  getSubsidizedPricing,
} from '@/services/registrationService';

const MASTER_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 };

// ============================================================
// Industries (industry_segments — used for org registration)
// ============================================================
export function useIndustries() {
  return useQuery({
    queryKey: ['industry_segments_for_reg'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_segments')
        .select('id, code, name')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    ...MASTER_CACHE,
  });
}

// ============================================================
// States/Provinces for a Country
// ============================================================
export function useStatesForCountry(countryId?: string) {
  return useQuery({
    queryKey: ['states_provinces', countryId],
    queryFn: async () => {
      if (!countryId) return [];
      const { data, error } = await supabase
        .from('md_states_provinces')
        .select('id, code, name')
        .eq('country_id', countryId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!countryId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Org Type Rules (for tier recommendation, flags)
// ============================================================
export function useOrgTypeRules(orgTypeId?: string) {
  return useQuery({
    queryKey: ['org_type_rules', orgTypeId],
    queryFn: async () => {
      if (!orgTypeId) return null;
      return deriveOrgTypeFlags(orgTypeId);
    },
    enabled: !!orgTypeId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Subsidized Pricing Lookup
// ============================================================
export function useSubsidizedPricing(orgTypeId?: string) {
  return useQuery({
    queryKey: ['subsidized_pricing', orgTypeId],
    queryFn: async () => {
      if (!orgTypeId) return null;
      return getSubsidizedPricing(orgTypeId);
    },
    enabled: !!orgTypeId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Country Pricing Validation (BR-TCP-001)
// ============================================================
export function useTierCountryPricing(countryId?: string) {
  return useQuery({
    queryKey: ['tier_country_pricing', countryId],
    queryFn: async () => {
      if (!countryId) return true;
      return validateCountryPricing(countryId);
    },
    enabled: !!countryId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Country Locale Info (BR-REG-001)
// ============================================================
export function useCountryLocale(countryId?: string) {
  return useQuery({
    queryKey: ['country_locale', countryId],
    queryFn: async () => {
      if (!countryId) return null;
      const { data, error } = await supabase
        .from('countries')
        .select('currency_code, currency_symbol, phone_code, date_format, number_format, address_format_template')
        .eq('id', countryId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!countryId,
    ...MASTER_CACHE,
  });
}

// ============================================================
// Duplicate Organization Check (BR-REG-007)
// ============================================================
export function useCheckDuplicateOrg() {
  return useMutation({
    mutationFn: async ({ legalEntityName, hqCountryId }: { legalEntityName: string; hqCountryId: string }) => {
      return checkDuplicateOrganization(legalEntityName, hqCountryId);
    },
  });
}

// ============================================================
// Create Organization (Step 1 save)
// ============================================================
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      legal_entity_name: string;
      trade_brand_name?: string;
      organization_type_id: string;
      employee_count_range: string;
      annual_revenue_range: string;
      founding_year: number;
      hq_country_id: string;
      hq_state_province_id: string;
      hq_city: string;
      industry_ids: string[];
      operating_geography_ids: string[];
      subsidized_discount_pct?: number;
      locale: {
        currency_code?: string | null;
        currency_symbol?: string;
        date_format?: string;
        number_format?: string;
        address_format_template?: Record<string, unknown> | null;
      };
    }) => {
      const { industry_ids, operating_geography_ids, locale, ...orgData } = payload;

      // 1. Insert the organization record
      const { data: org, error: orgError } = await supabase
        .from('seeker_organizations')
        .insert({
          organization_name: orgData.legal_entity_name,
          legal_entity_name: orgData.legal_entity_name,
          trade_brand_name: orgData.trade_brand_name || null,
          organization_type_id: orgData.organization_type_id,
          employee_count_range: orgData.employee_count_range,
          annual_revenue_range: orgData.annual_revenue_range,
          founding_year: orgData.founding_year,
          hq_country_id: orgData.hq_country_id,
          hq_state_province_id: orgData.hq_state_province_id,
          hq_city: orgData.hq_city,
          tenant_id: crypto.randomUUID(), // Self-tenant for new org
          registration_step: 1,
          preferred_currency: locale.currency_code?.substring(0, 3) || 'USD',
          date_format: locale.date_format || 'MM/DD/YYYY',
          number_format: locale.number_format || '1,234.56',
          address_format_template: locale.address_format_template as any,
          subsidized_discount_pct: orgData.subsidized_discount_pct ?? 0,
        })
        .select('id, tenant_id')
        .single();

      if (orgError) throw new Error(orgError.message);

      // 2. Batch insert industries (seeker_org_industries requires tenant_id)
      if (industry_ids.length > 0) {
        const industryRows = industry_ids.map((industry_id) => ({
          organization_id: org.id,
          tenant_id: org.tenant_id,
          industry_id,
        }));
        const { error: indError } = await supabase
          .from('seeker_org_industries')
          .insert(industryRows);
        if (indError) throw new Error(indError.message);
      }

      // 3. Batch insert operating geographies
      if (operating_geography_ids.length > 0) {
        const geoRows = operating_geography_ids.map((country_id) => ({
          organization_id: org.id,
          country_id,
        }));
        const { error: geoError } = await supabase
          .from('seeker_org_operating_geographies')
          .insert(geoRows);
        if (geoError) throw new Error(geoError.message);
      }

      return { organizationId: org.id, tenantId: org.tenant_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seeker_organizations'] });
      toast.success('Organization details saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save organization: ${error.message}`);
    },
  });
}
