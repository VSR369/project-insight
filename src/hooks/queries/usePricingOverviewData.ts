/**
 * Pricing Overview Data Hook
 * 
 * Fetches all tier-country pricing rows joined with country names.
 * Also provides platform fees data for the overview page.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TierCountryPricingRow {
  id: string;
  tier_id: string;
  country_id: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  monthly_price_usd: number;
  local_price: number | null;
}

export function useAllTierCountryPricing() {
  return useQuery({
    queryKey: ["all_tier_country_pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_tier_country_pricing")
        .select("id, tier_id, country_id, monthly_price_usd, local_price, currency_code, countries!md_tier_country_pricing_country_id_fkey(name, currency_symbol)")
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        tier_id: row.tier_id,
        country_id: row.country_id,
        monthly_price_usd: row.monthly_price_usd,
        local_price: row.local_price,
        currency_code: row.currency_code,
        country_name: row.countries?.name ?? "Unknown",
        currency_symbol: row.countries?.currency_symbol ?? "$",
      })) as TierCountryPricingRow[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

interface PlatformFeeOverview {
  id: string;
  engagement_model_id: string;
  tier_id: string;
  platform_fee_pct: number;
  description: string | null;
  model_name: string;
  tier_name: string;
}

export function useAllPlatformFees() {
  return useQuery({
    queryKey: ["all_platform_fees_overview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_platform_fees")
        .select("id, engagement_model_id, tier_id, platform_fee_pct, description, md_engagement_models(name), md_subscription_tiers(name)")
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        id: row.id,
        engagement_model_id: row.engagement_model_id,
        tier_id: row.tier_id,
        platform_fee_pct: row.platform_fee_pct,
        description: row.description,
        model_name: row.md_engagement_models?.name ?? "Unknown",
        tier_name: row.md_subscription_tiers?.name ?? "Unknown",
      })) as PlatformFeeOverview[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
