/**
 * Resolved Shadow Pricing Hook
 * 
 * Merges org-level overrides with platform defaults.
 * Resolution: org override > platform default for each tier+country combo.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ResolvedShadowPrice {
  tier_id: string;
  country_id: string | null;
  shadow_charge_per_challenge: number;
  currency_code: string;
  currency_symbol: string;
  source: "org" | "platform";
  tier_name?: string;
  country_name?: string;
}

/**
 * Returns resolved shadow pricing for an org.
 * If orgId is provided, org overrides take priority over platform defaults.
 * If orgId is not provided, returns platform defaults only.
 */
export function useResolvedShadowPricing(orgId?: string) {
  return useQuery({
    queryKey: ["resolved-shadow-pricing", orgId],
    queryFn: async () => {
      // Fetch platform defaults
      const { data: platformData, error: platformError } = await supabase
        .from("md_shadow_pricing")
        .select("tier_id, country_id, shadow_charge_per_challenge, currency_code, currency_symbol, md_subscription_tiers(name), countries(name)")
        .eq("is_active", true);
      if (platformError) throw new Error(platformError.message);

      const platformMap = new Map<string, ResolvedShadowPrice>();
      for (const row of platformData ?? []) {
        const key = `${row.tier_id}|${row.country_id ?? ""}`;
        platformMap.set(key, {
          tier_id: row.tier_id,
          country_id: row.country_id,
          shadow_charge_per_challenge: row.shadow_charge_per_challenge,
          currency_code: row.currency_code,
          currency_symbol: row.currency_symbol,
          source: "platform",
          tier_name: (row.md_subscription_tiers as { name: string } | null)?.name,
          country_name: (row.countries as { name: string } | null)?.name,
        });
      }

      // If org context available, fetch org overrides
      if (orgId) {
        const { data: orgData, error: orgError } = await supabase
          .from("org_shadow_pricing")
          .select("tier_id, country_id, shadow_charge_per_challenge, currency_code, currency_symbol, md_subscription_tiers(name), countries(name)")
          .eq("organization_id", orgId)
          .eq("is_active", true);
        if (orgError) throw new Error(orgError.message);

        for (const row of orgData ?? []) {
          const key = `${row.tier_id}|${row.country_id ?? ""}`;
          platformMap.set(key, {
            tier_id: row.tier_id,
            country_id: row.country_id,
            shadow_charge_per_challenge: row.shadow_charge_per_challenge,
            currency_code: row.currency_code,
            currency_symbol: row.currency_symbol,
            source: "org",
            tier_name: (row.md_subscription_tiers as { name: string } | null)?.name,
            country_name: (row.countries as { name: string } | null)?.name,
          });
        }
      }

      return Array.from(platformMap.values());
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
