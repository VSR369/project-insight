/**
 * useCurationPageData — Extracted from CurationReviewPage (Phase D2.1).
 *
 * Encapsulates all useState declarations and useQuery calls that were
 * previously inlined in the page component. Pure data hook — no callbacks,
 * no side effects, no rendering logic.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STANDARD } from "@/config/queryCache";
import { useCurationMasterData, type CurationMasterData } from "@/hooks/cogniblend/useCurationMasterData";
import type { PreFlightResult } from "@/lib/cogniblend/preFlightCheck";
import type { BudgetShortfallResult } from "@/lib/cogniblend/budgetShortfallDetection";
import type { SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import type {
  ChallengeData,
  ChallengeDataCore,
  ChallengeDataDeferred,
  LegalDocSummary,
  LegalDocDetail,
  EscrowRecord,
  AIQualitySummary,
} from "@/lib/cogniblend/curationTypes";

/* ── SELECT column lists ─────────────────────────────── */

const CHALLENGE_CORE_SELECT = [
  "id", "title", "problem_statement", "scope", "hook", "description",
  "deliverables", "expected_outcomes", "evaluation_criteria",
  "reward_structure", "phase_schedule", "ip_model", "maturity_level",
  "domain_tags", "currency_code", "operating_model",
  "governance_profile", "governance_mode_override",
  "current_phase", "phase_status", "organization_id",
  "curation_lock_status", "curation_frozen_at",
  "extended_brief", "creator_legal_instructions",
  "ai_section_reviews", "visibility",
  "evaluation_method", "evaluator_count", "solver_audience",
  // JOIN org type name inline to eliminate waterfall
  "seeker_organizations!challenges_organization_id_fkey(organization_type_id, organization_types(name))",
].join(", ");

const CHALLENGE_DEFERRED_SELECT = [
  "id",
  "industry_segment_id",
  "complexity_score", "complexity_level", "complexity_parameters",
  "complexity_locked", "complexity_locked_at", "complexity_locked_by",
  "solver_eligibility_types", "solver_visibility_types",
  "solver_expertise_requirements", "targeting_filters",
  "eligibility_model", "eligibility", "solution_type", "solution_types",
  "data_resources_provided", "success_metrics_kpis",
  "max_solutions", "lc_review_required",
].join(", ");

/* ── Return type (unchanged shape) ───────────────────── */

export interface CurationPageState {
  activeGroup: string;
  setActiveGroup: React.Dispatch<React.SetStateAction<string>>;
  editingSection: string | null;
  setEditingSection: React.Dispatch<React.SetStateAction<string | null>>;
  savingSection: boolean;
  setSavingSection: React.Dispatch<React.SetStateAction<boolean>>;
  approvedSections: Record<string, boolean>;
  setApprovedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  aiReviews: SectionReview[];
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  aiReviewsLoaded: boolean;
  setAiReviewsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  aiReviewLoading: boolean;
  setAiReviewLoading: React.Dispatch<React.SetStateAction<boolean>>;
  phase2Progress: { total: number; completed: number };
  setPhase2Progress: React.Dispatch<React.SetStateAction<{ total: number; completed: number }>>;
  phase2Status: "idle" | "running" | "completed";
  setPhase2Status: React.Dispatch<React.SetStateAction<"idle" | "running" | "completed">>;
  aiSuggestedComplexity: Record<string, { rating: number; justification: string; evidence_sections?: string[] }> | null;
  setAiSuggestedComplexity: React.Dispatch<React.SetStateAction<Record<string, { rating: number; justification: string; evidence_sections?: string[] }> | null>>;
  triageTotalCount: number;
  setTriageTotalCount: React.Dispatch<React.SetStateAction<number>>;
  manualOverrides: Record<number, boolean>;
  setManualOverrides: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  expandVersion: number;
  setExpandVersion: React.Dispatch<React.SetStateAction<number>>;
  highlightWarnings: boolean;
  setHighlightWarnings: React.Dispatch<React.SetStateAction<boolean>>;
  showOnlyStale: boolean;
  setShowOnlyStale: React.Dispatch<React.SetStateAction<boolean>>;
  guidedMode: boolean;
  setGuidedMode: React.Dispatch<React.SetStateAction<boolean>>;
  dismissedPrereqBanner: Set<string>;
  setDismissedPrereqBanner: React.Dispatch<React.SetStateAction<Set<string>>>;
  optimisticIndustrySegId: string | null;
  setOptimisticIndustrySegId: React.Dispatch<React.SetStateAction<string | null>>;
  escrowEnabled: boolean;
  setEscrowEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isAcceptingAllLegal: boolean;
  setIsAcceptingAllLegal: React.Dispatch<React.SetStateAction<boolean>>;
  preFlightResult: PreFlightResult | null;
  setPreFlightResult: React.Dispatch<React.SetStateAction<PreFlightResult | null>>;
  preFlightDialogOpen: boolean;
  setPreFlightDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  budgetShortfall: BudgetShortfallResult | null;
  setBudgetShortfall: React.Dispatch<React.SetStateAction<BudgetShortfallResult | null>>;
  contextLibraryOpen: boolean;
  setContextLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pass1DoneSession: boolean;
  setPass1DoneSession: React.Dispatch<React.SetStateAction<boolean>>;
  aiQuality: AIQualitySummary | null;
  setAiQuality: React.Dispatch<React.SetStateAction<AIQualitySummary | null>>;
  aiQualityLoading: boolean;
  setAiQualityLoading: React.Dispatch<React.SetStateAction<boolean>>;
  lockedSendState: {
    open: boolean;
    sectionKey: string;
    sectionLabel: string;
    initialComment: string;
    aiOriginalComments: string;
  };
  setLockedSendState: React.Dispatch<React.SetStateAction<{
    open: boolean;
    sectionKey: string;
    sectionLabel: string;
    initialComment: string;
    aiOriginalComments: string;
  }>>;
  challenge: ChallengeData | undefined;
  isLoading: boolean;
  orgTypeName: string | null | undefined;
  legalDocs: LegalDocSummary[];
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;
  masterData: CurationMasterData;
  sectionActions: Array<{
    id: string;
    section_key: string;
    action_type: string;
    status: string;
    addressed_to: string | null;
    priority: string | null;
    comment_html: string | null;
    created_at: string;
    responded_at: string | null;
    response_html: string | null;
  }>;
}

/* ── Hook ─────────────────────────────────────────────── */

export function useCurationPageData(challengeId: string | undefined): CurationPageState {
  // ── useState declarations ──
  const [activeGroup, setActiveGroup] = useState<string>("organization");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [approvedSections, setApprovedSections] = useState<Record<string, boolean>>({});
  const [aiReviews, setAiReviews] = useState<SectionReview[]>([]);
  const [aiReviewsLoaded, setAiReviewsLoaded] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [phase2Progress, setPhase2Progress] = useState({ total: 0, completed: 0 });
  const [phase2Status, setPhase2Status] = useState<"idle" | "running" | "completed">("idle");
  const [aiSuggestedComplexity, setAiSuggestedComplexity] = useState<Record<string, { rating: number; justification: string; evidence_sections?: string[] }> | null>(null);
  const [triageTotalCount, setTriageTotalCount] = useState(0);
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});
  const [expandVersion, setExpandVersion] = useState(0);
  const [highlightWarnings, setHighlightWarnings] = useState(false);
  const [showOnlyStale, setShowOnlyStale] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
  const [dismissedPrereqBanner, setDismissedPrereqBanner] = useState<Set<string>>(new Set());
  const [optimisticIndustrySegId, setOptimisticIndustrySegId] = useState<string | null>(null);
  const [escrowEnabled, setEscrowEnabled] = useState(false);
  const [isAcceptingAllLegal, setIsAcceptingAllLegal] = useState(false);
  const [preFlightResult, setPreFlightResult] = useState<PreFlightResult | null>(null);
  const [preFlightDialogOpen, setPreFlightDialogOpen] = useState(false);
  const [budgetShortfall, setBudgetShortfall] = useState<BudgetShortfallResult | null>(null);
  const [contextLibraryOpen, setContextLibraryOpen] = useState(false);
  const [pass1DoneSession, setPass1DoneSession] = useState(false);
  const [aiQuality, setAiQuality] = useState<AIQualitySummary | null>(null);
  const [aiQualityLoading, setAiQualityLoading] = useState(false);
  const [lockedSendState, setLockedSendState] = useState<{
    open: boolean; sectionKey: string; sectionLabel: string;
    initialComment: string; aiOriginalComments: string;
  }>({ open: false, sectionKey: "", sectionLabel: "", initialComment: "", aiOriginalComments: "" });

  // ── Core challenge query (with org type JOIN — eliminates waterfall) ──
  const { data: challengeCore, isLoading } = useQuery({
    queryKey: ["curation-review", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(CHALLENGE_CORE_SELECT)
        .eq("id", challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ChallengeDataCore;
    },
    enabled: !!challengeId,
    placeholderData: (prev: ChallengeDataCore | undefined) => prev,
  });

  // Derive orgTypeName from the JOIN result (no separate query)
  const orgTypeName = challengeCore?.seeker_organizations?.organization_types?.name ?? null;

  // ── Deferred challenge fields (analysis/assessment — loaded after initial render) ──
  const { data: challengeDetails } = useQuery({
    queryKey: ["curation-challenge-details", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(CHALLENGE_DEFERRED_SELECT)
        .eq("id", challengeId!)
        .maybeSingle();
      if (error) return null;
      return data as unknown as ChallengeDataDeferred;
    },
    enabled: !!challengeId && !isLoading,
    ...CACHE_STANDARD,
  });

  // Merge core + deferred into unified ChallengeData
  const challenge: ChallengeData | undefined = useMemo(() => {
    if (!challengeCore) return undefined;
    return { ...challengeCore, ...(challengeDetails ?? {}) } as ChallengeData;
  }, [challengeCore, challengeDetails]);

  // ── Legal docs (single merged query) ──
  const { data: legalDocsRaw = [] } = useQuery({
    queryKey: ["curation-legal-docs", challengeId],
    queryFn: async (): Promise<LegalDocDetail[]> => {
      const { data, error } = await supabase
        .from("challenge_legal_docs")
        .select("id, document_type, document_name, content_summary, lc_status, status, tier")
        .eq("challenge_id", challengeId!)
        .order("tier")
        .order("document_type");
      if (error) return [];
      return (data ?? []) as LegalDocDetail[];
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const legalDocs: LegalDocSummary[] = (() => {
    const tiers = ["TIER_1", "TIER_2"] as const;
    return tiers.map((tier) => {
      const ofTier = legalDocsRaw.filter((r) => r.tier === tier);
      return {
        tier: tier === "TIER_1" ? "Tier 1: Entry-Phase" : "Tier 2: Solution-Phase",
        total: ofTier.length,
        attached: ofTier.filter((r) => r.status === "default_applied" || r.status === "custom_uploaded" || r.status === "ATTACHED").length,
      };
    });
  })();

  const legalDetails = legalDocsRaw;

  // ── Deferred: escrow (not needed for initial render) ──
  const { data: escrowRecord = null } = useQuery({
    queryKey: ["curation-escrow", challengeId],
    queryFn: async (): Promise<EscrowRecord | null> => {
      const { data, error } = await supabase
        .from("escrow_records")
        .select("id, escrow_status, deposit_amount, remaining_amount, bank_name, bank_branch, bank_address, currency, deposit_date, deposit_reference, fc_notes")
        .eq("challenge_id", challengeId!)
        .maybeSingle();
      if (error) return null;
      return data as EscrowRecord | null;
    },
    enabled: !!challengeId && !isLoading,
    ...CACHE_STANDARD,
  });

  const masterData = useCurationMasterData();

  // ── Deferred: section actions ──
  const { data: sectionActions = [] } = useQuery({
    queryKey: ["curator-section-actions", challengeId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("curator_section_actions")
        .select("id, section_key, action_type, status, addressed_to, priority, comment_html, created_at, responded_at, response_html")
        .eq("challenge_id", challengeId!)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as unknown as Array<{
        id: string; section_key: string; action_type: string; status: string;
        addressed_to: string | null; priority: string | null; comment_html: string | null;
        created_at: string; responded_at: string | null; response_html: string | null;
      }>;
    },
    enabled: !!challengeId && !isLoading,
    ...CACHE_STANDARD,
  });

  return {
    activeGroup, setActiveGroup, editingSection, setEditingSection,
    savingSection, setSavingSection, approvedSections, setApprovedSections,
    aiReviews, setAiReviews, aiReviewsLoaded, setAiReviewsLoaded,
    aiReviewLoading, setAiReviewLoading,
    phase2Progress, setPhase2Progress, phase2Status, setPhase2Status,
    aiSuggestedComplexity, setAiSuggestedComplexity,
    triageTotalCount, setTriageTotalCount, manualOverrides, setManualOverrides,
    expandVersion, setExpandVersion, highlightWarnings, setHighlightWarnings,
    showOnlyStale, setShowOnlyStale, guidedMode, setGuidedMode,
    dismissedPrereqBanner, setDismissedPrereqBanner,
    optimisticIndustrySegId, setOptimisticIndustrySegId,
    escrowEnabled, setEscrowEnabled, isAcceptingAllLegal, setIsAcceptingAllLegal,
    preFlightResult, setPreFlightResult, preFlightDialogOpen, setPreFlightDialogOpen,
    budgetShortfall, setBudgetShortfall, contextLibraryOpen, setContextLibraryOpen,
    pass1DoneSession, setPass1DoneSession,
    aiQuality, setAiQuality, aiQualityLoading, setAiQualityLoading,
    lockedSendState, setLockedSendState,
    challenge, isLoading, orgTypeName,
    legalDocs, legalDetails, escrowRecord, masterData, sectionActions,
  };
}
