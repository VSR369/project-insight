/**
 * useCurationMasterData — Batch-fetches master data options used by
 * curator section renderers (maturity levels, complexity levels,
 * visibility options, effort levels, IP models, eligibility/solver profiles).
 *
 * Centralizes all master data lookups so renderers don't hardcode options.
 * Phase 5A: Now fetches solver eligibility tiers from md_solver_eligibility.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STABLE } from "@/config/queryCache";
import {
  MATURITY_LABELS,
  MATURITY_DESCRIPTIONS,
} from "@/lib/maturityLabels";
import {
  VISIBILITY_OPTIONS,
} from "@/constants/challengeOptions.constants";

/* ── Types ─────────────────────────────────────────────── */

export interface MasterDataOption {
  value: string;
  label: string;
  description?: string;
}

export interface CurationMasterData {
  maturityOptions: MasterDataOption[];
  complexityOptions: MasterDataOption[];
  /** Solver-tier visibility options from md_solver_eligibility */
  visibilityOptions: MasterDataOption[];
  
  
  ipModelOptions: MasterDataOption[];
  /** Solver-tier eligibility options from md_solver_eligibility */
  eligibilityOptions: MasterDataOption[];
  isLoading: boolean;
}

/* ── Static options (no DB table needed) ───────────────── */


const IP_MODEL_OPTIONS: MasterDataOption[] = [
  { value: "IP-EA", label: "Exclusive Assignment", description: "All intellectual property transfers to the challenge seeker" },
  { value: "IP-NEL", label: "Non-Exclusive License", description: "Solver retains ownership, grants license to seeker" },
  { value: "IP-EL", label: "Exclusive License", description: "Solver grants exclusive license to seeker" },
  { value: "IP-JO", label: "Joint Ownership", description: "Joint ownership between solver and seeker" },
  { value: "IP-NONE", label: "No IP Transfer", description: "Solver retains full IP ownership" },
];

/* ── Hook ──────────────────────────────────────────────── */

export function useCurationMasterData(): CurationMasterData {
  // Fetch complexity levels from DB
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

  // Fetch solver eligibility tiers from DB (used for BOTH eligibility & visibility sections)
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

  // Build maturity options from constants — use UPPERCASE values to match DB normalizer
  const maturityOptions = useMemo<MasterDataOption[]>(() =>
    Object.entries(MATURITY_LABELS).map(([key, label]) => ({
      value: key.toUpperCase(),
      label: label as string,
      description: MATURITY_DESCRIPTIONS[key],
    })),
    [],
  );

  // Build complexity options from DB
  const complexityOptions = useMemo<MasterDataOption[]>(() =>
    (complexityRows ?? []).map((r) => ({
      value: r.complexity_code,
      label: r.complexity_label,
      description: `Level ${r.complexity_level}`,
    })),
    [complexityRows],
  );

  // Build solver tier options from DB (shared for eligibility & visibility)
  const solverTierOptions = useMemo<MasterDataOption[]>(() =>
    (solverTierRows ?? []).map((r) => ({
      value: r.code,
      label: r.label,
      description: r.description ?? undefined,
    })),
    [solverTierRows],
  );

  // Build challenge visibility options from constants (separate from solver tiers)
  const challengeVisibilityOptions = useMemo<MasterDataOption[]>(() =>
    VISIBILITY_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
      description: o.description,
    })),
    [],
  );

  return {
    maturityOptions,
    complexityOptions,
    challengeVisibilityOptions,
    visibilityOptions: solverTierOptions,
    
    ipModelOptions: IP_MODEL_OPTIONS,
    eligibilityOptions: solverTierOptions,
    isLoading: complexityLoading || solverTierLoading,
  };
}
