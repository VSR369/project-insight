/**
 * useCurationMasterData — Batch-fetches master data options used by
 * curator section renderers (maturity levels, complexity levels,
 * visibility options, IP models, eligibility/solver profiles).
 *
 * All options fetched from DB with graceful fallbacks.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STABLE } from "@/config/queryCache";
import { MATURITY_LABELS, MATURITY_DESCRIPTIONS } from "@/lib/maturityLabels";

/* ── Types ─────────────────────────────────────────────── */

export interface MasterDataOption {
  value: string;
  label: string;
  description?: string;
}

export interface CurationMasterData {
  maturityOptions: MasterDataOption[];
  complexityOptions: MasterDataOption[];
  visibilityOptions: MasterDataOption[];
  ipModelOptions: MasterDataOption[];
  eligibilityOptions: MasterDataOption[];
  isLoading: boolean;
}

/* ── Fallback constants ────────────────────────────────── */

const FALLBACK_IP_OPTIONS: MasterDataOption[] = [
  { value: "IP-EA", label: "Exclusive Assignment", description: "All intellectual property transfers to the challenge seeker" },
  { value: "IP-NEL", label: "Non-Exclusive License", description: "Solver retains ownership, grants license to seeker" },
  { value: "IP-EL", label: "Exclusive License", description: "Solver grants exclusive license to seeker" },
  { value: "IP-JO", label: "Joint Ownership", description: "Joint ownership between solver and seeker" },
  { value: "IP-NONE", label: "No IP Transfer", description: "Solver retains full IP ownership" },
];

/* ── Hook ──────────────────────────────────────────────── */

export function useCurationMasterData(): CurationMasterData {
  const { data: complexityRows, isLoading: complexityLoading } = useQuery({
    queryKey: ["master-complexity-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_challenge_complexity")
        .select("id, complexity_code, complexity_label, complexity_level, display_order")
        .eq("is_active", true)
        .order("display_order");
      if (error) return [];
      return data ?? [];
    },
    ...CACHE_STABLE,
  });

  const { data: solverTierRows, isLoading: solverTierLoading } = useQuery({
    queryKey: ["master-solver-eligibility-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_solver_eligibility")
        .select("id, code, label, description, display_order")
        .eq("is_active", true)
        .order("display_order");
      if (error) return [];
      return data ?? [];
    },
    ...CACHE_STABLE,
  });

  const { data: maturityRows, isLoading: maturityLoading } = useQuery({
    queryKey: ["master-solution-maturity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_solution_maturity")
        .select("id, code, label, description, display_order")
        .eq("is_active", true)
        .order("display_order");
      if (error) return [];
      return data ?? [];
    },
    ...CACHE_STABLE,
  });

  const { data: ipModelRows, isLoading: ipModelLoading } = useQuery({
    queryKey: ["master-ip-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("md_ip_models" as never)
        .select("id, code, label, description, display_order")
        .eq("is_active", true)
        .order("display_order");
      if (error || !data || (data as unknown[]).length === 0) return null;
      return data as { id: string; code: string; label: string; description: string | null; display_order: number }[];
    },
    ...CACHE_STABLE,
  });

  const maturityOptions = useMemo<MasterDataOption[]>(() =>
    maturityRows && maturityRows.length > 0
      ? maturityRows.map((r) => ({
          value: r.code,
          label: r.label,
          description: r.description ?? undefined,
        }))
      : Object.entries(MATURITY_LABELS).map(([key, label]) => ({
          value: key.toUpperCase(),
          label,
          description: MATURITY_DESCRIPTIONS[key],
        })),
    [maturityRows],
  );

  const complexityOptions = useMemo<MasterDataOption[]>(() =>
    (complexityRows ?? []).map((r) => ({
      value: r.complexity_code,
      label: r.complexity_label,
      description: `Level ${r.complexity_level}`,
    })),
    [complexityRows],
  );

  const solverTierOptions = useMemo<MasterDataOption[]>(() =>
    (solverTierRows ?? []).map((r) => ({
      value: r.code,
      label: r.label,
      description: r.description ?? undefined,
    })),
    [solverTierRows],
  );

  const ipModelOptions = useMemo<MasterDataOption[]>(() =>
    ipModelRows
      ? ipModelRows.map((r) => ({
          value: r.code,
          label: r.label,
          description: r.description ?? undefined,
        }))
      : FALLBACK_IP_OPTIONS,
    [ipModelRows],
  );

  return {
    maturityOptions,
    complexityOptions,
    visibilityOptions: solverTierOptions,
    ipModelOptions,
    eligibilityOptions: solverTierOptions,
    isLoading: complexityLoading || solverTierLoading || maturityLoading || ipModelLoading,
  };
}
