/**
 * useCurationMasterData — Batch-fetches master data options used by
 * curator section renderers (maturity levels, complexity levels,
 * visibility options, effort levels, IP models, eligibility/solver profiles).
 *
 * Centralizes all master data lookups so renderers don't hardcode options.
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
  visibilityOptions: MasterDataOption[];
  effortOptions: MasterDataOption[];
  ipModelOptions: MasterDataOption[];
  eligibilityOptions: MasterDataOption[];
  isLoading: boolean;
}

/* ── Static options (no DB table needed) ───────────────── */

const EFFORT_OPTIONS: MasterDataOption[] = [
  { value: "low", label: "Low", description: "< 40 hours estimated effort" },
  { value: "medium", label: "Medium", description: "40–160 hours estimated effort" },
  { value: "high", label: "High", description: "160–500 hours estimated effort" },
  { value: "expert", label: "Expert", description: "500+ hours, deep domain expertise" },
];

const IP_MODEL_OPTIONS: MasterDataOption[] = [
  { value: "full_transfer", label: "Full IP Transfer", description: "All intellectual property transfers to the challenge seeker" },
  { value: "licensed", label: "Licensed Use", description: "Solver retains ownership, grants license to seeker" },
  { value: "shared", label: "Shared IP", description: "Joint ownership between solver and seeker" },
  { value: "open_source", label: "Open Source", description: "Solution released under open source license" },
  { value: "retained", label: "Solver Retains", description: "Solver retains full IP ownership" },
];

/** Eligibility / solver profile types — static until a DB table is created */
const ELIGIBILITY_OPTIONS: MasterDataOption[] = [
  { value: "individual", label: "Individual Solver", description: "Single person can submit" },
  { value: "team", label: "Team", description: "Multi-person team submissions" },
  { value: "organization", label: "Organization", description: "Corporate or institutional submissions" },
  { value: "academic", label: "Academic", description: "University or research institution" },
  { value: "startup", label: "Startup", description: "Early-stage company submissions" },
  { value: "any", label: "Any", description: "Open to all solver types" },
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

  // Build maturity options from constants
  const maturityOptions = useMemo<MasterDataOption[]>(() =>
    Object.entries(MATURITY_LABELS).map(([key, label]) => ({
      value: key,
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

  // Build visibility options from constants
  const visibilityOptions = useMemo<MasterDataOption[]>(() =>
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
    visibilityOptions,
    effortOptions: EFFORT_OPTIONS,
    ipModelOptions: IP_MODEL_OPTIONS,
    eligibilityOptions: ELIGIBILITY_OPTIONS,
    isLoading: complexityLoading,
  };
}
