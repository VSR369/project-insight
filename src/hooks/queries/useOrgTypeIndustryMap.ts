/**
 * Org Type ↔ Industry Segment mapping hooks.
 *
 * The mapping table `org_type_industry_segments` controls which Industry
 * Segments appear in the registration form for a given Organization Type
 * (consumed by `useIndustries(orgTypeId)`).
 *
 * These hooks expose the mapping to the Admin Master Data pages so admins
 * can read and maintain it from both directions.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withCreatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";
import { toast } from "sonner";

const MAP_CACHE = { staleTime: 5 * 60 * 1000, gcTime: 30 * 60 * 1000 };

interface MappingRow {
  org_type_id: string;
  industry_id: string;
}

/** Full mapping table — cheap, used for column rollups on both admin pages. */
export function useOrgTypeIndustryMappings() {
  return useQuery({
    queryKey: ["org_type_industry_mappings"],
    queryFn: async (): Promise<MappingRow[]> => {
      const { data, error } = await supabase
        .from("org_type_industry_segments")
        .select("org_type_id, industry_id")
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return (data ?? []) as MappingRow[];
    },
    ...MAP_CACHE,
  });
}

/** Industry IDs currently linked to an Organization Type. */
export function useIndustriesForOrgType(orgTypeId?: string) {
  return useQuery({
    queryKey: ["industries_for_org_type", orgTypeId],
    queryFn: async (): Promise<string[]> => {
      if (!orgTypeId) return [];
      const { data, error } = await supabase
        .from("org_type_industry_segments")
        .select("industry_id")
        .eq("org_type_id", orgTypeId)
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.industry_id);
    },
    enabled: !!orgTypeId,
    ...MAP_CACHE,
  });
}

/** Org Type IDs currently linked to an Industry Segment. */
export function useOrgTypesForIndustry(industryId?: string) {
  return useQuery({
    queryKey: ["org_types_for_industry", industryId],
    queryFn: async (): Promise<string[]> => {
      if (!industryId) return [];
      const { data, error } = await supabase
        .from("org_type_industry_segments")
        .select("org_type_id")
        .eq("industry_id", industryId)
        .eq("is_active", true);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.org_type_id);
    },
    enabled: !!industryId,
    ...MAP_CACHE,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["org_type_industry_mappings"] });
  qc.invalidateQueries({ queryKey: ["industries_for_org_type"] });
  qc.invalidateQueries({ queryKey: ["org_types_for_industry"] });
  // Registration form cache (see useRegistrationData.useIndustries)
  qc.invalidateQueries({ queryKey: ["industry_segments_for_reg"] });
}

async function diffApply(
  orgTypeId: string | null,
  industryId: string | null,
  desiredOrgTypeIds: string[] | null,
  desiredIndustryIds: string[] | null,
): Promise<void> {
  // Read existing rows scoped by whichever side is fixed.
  const filterCol = orgTypeId ? "org_type_id" : "industry_id";
  const filterVal = (orgTypeId ?? industryId) as string;

  const { data: existing, error: readErr } = await supabase
    .from("org_type_industry_segments")
    .select("id, org_type_id, industry_id")
    .eq(filterCol, filterVal);
  if (readErr) throw new Error(readErr.message);

  const existingMap = new Map<string, string>(); // counterpartId -> rowId
  (existing ?? []).forEach((r) => {
    const counterpart = orgTypeId ? r.industry_id : r.org_type_id;
    existingMap.set(counterpart, r.id);
  });

  const desired = new Set(orgTypeId ? (desiredIndustryIds ?? []) : (desiredOrgTypeIds ?? []));
  const existingIds = new Set(existingMap.keys());

  const toInsert = [...desired].filter((id) => !existingIds.has(id));
  const toDeleteRowIds = [...existingMap.entries()]
    .filter(([counterpart]) => !desired.has(counterpart))
    .map(([, rowId]) => rowId);

  if (toInsert.length > 0) {
    const rows = await Promise.all(
      toInsert.map(async (counterpart) =>
        withCreatedBy({
          org_type_id: orgTypeId ?? counterpart,
          industry_id: industryId ?? counterpart,
          is_active: true,
        }),
      ),
    );
    const { error: insErr } = await supabase.from("org_type_industry_segments").insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  if (toDeleteRowIds.length > 0) {
    const { error: delErr } = await supabase
      .from("org_type_industry_segments")
      .delete()
      .in("id", toDeleteRowIds);
    if (delErr) throw new Error(delErr.message);
  }
}

export function useSetIndustryOrgTypes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { industryId: string; orgTypeIds: string[] }) => {
      await diffApply(null, input.industryId, input.orgTypeIds, null);
    },
    onSuccess: () => {
      invalidateAll(qc);
    },
    onError: (e) => {
      handleMutationError(e, { operation: "set_industry_org_types" });
      toast.error("Failed to save organization type mappings.");
    },
  });
}

export function useSetOrgTypeIndustries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { orgTypeId: string; industryIds: string[] }) => {
      await diffApply(input.orgTypeId, null, null, input.industryIds);
    },
    onSuccess: () => {
      invalidateAll(qc);
    },
    onError: (e) => {
      handleMutationError(e, { operation: "set_org_type_industries" });
      toast.error("Failed to save industry segment mappings.");
    },
  });
}
