/**
 * Org Shadow Pricing CRUD Hooks
 * 
 * Org-scoped overrides for platform default shadow pricing.
 * Scoped by organization_id + tenant_id via RLS.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface OrgShadowPricing {
  id: string;
  organization_id: string;
  tier_id: string;
  country_id: string | null;
  shadow_charge_per_challenge: number;
  currency_code: string;
  currency_symbol: string;
  description: string | null;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface OrgShadowPricingInsert {
  organization_id: string;
  tier_id: string;
  country_id?: string | null;
  shadow_charge_per_challenge: number;
  currency_code?: string;
  currency_symbol?: string;
  description?: string | null;
  is_active?: boolean;
  tenant_id: string;
}

type OrgShadowPricingWithJoins = OrgShadowPricing & {
  md_subscription_tiers?: { name: string } | null;
  countries?: { name: string; currency_code: string; currency_symbol: string } | null;
};

const TABLE = "org_shadow_pricing";
const KEY = ["org-shadow-pricing"];

export function useOrgShadowPricing(orgId?: string, includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, orgId, { includeInactive }],
    queryFn: async () => {
      if (!orgId) return [];
      let q = supabase
        .from(TABLE)
        .select(`id, organization_id, tier_id, country_id, shadow_charge_per_challenge, currency_code, currency_symbol, description, is_active, tenant_id, created_at, updated_at, md_subscription_tiers(name), countries(name, currency_code, currency_symbol)`)
        .eq("organization_id", orgId)
        .order("created_at");
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data as OrgShadowPricingWithJoins[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreateOrgShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: OrgShadowPricingInsert) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from(TABLE).insert(d).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Shadow pricing override created successfully");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "create_org_shadow_pricing" }),
  });
}

export function useUpdateOrgShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<OrgShadowPricing> & { id: string }) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from(TABLE).update(d).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Shadow pricing override updated successfully");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "update_org_shadow_pricing" }),
  });
}

export function useDeleteOrgShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Shadow pricing override deactivated");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_org_shadow_pricing" }),
  });
}

export function useRestoreOrgShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Shadow pricing override restored");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_org_shadow_pricing" }),
  });
}

export function useHardDeleteOrgShadowPricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Shadow pricing override permanently deleted");
    },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_org_shadow_pricing" }),
  });
}
