/**
 * useCurationPageData — Extracted from CurationReviewPage (Phase D2.1).
 *
 * Encapsulates all useState declarations and useQuery calls that were
 * previously inlined in the page component. Pure data hook — no callbacks,
 * no side effects, no rendering logic.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CACHE_STANDARD } from "@/config/queryCache";
import { useCurationMasterData, type CurationMasterData } from "@/hooks/cogniblend/useCurationMasterData";
import type { PreFlightResult } from "@/lib/cogniblend/preFlightCheck";
import type { BudgetShortfallResult } from "@/lib/cogniblend/budgetShortfallDetection";
import type { SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import type {
  ChallengeData,
  LegalDocSummary,
  LegalDocDetail,
  EscrowRecord,
  AIQualitySummary,
} from "@/lib/cogniblend/curationTypes";

/* ── Return type ──────────────────────────────────────── */

export interface CurationPageState {
  // State: group & section editing
  activeGroup: string;
  setActiveGroup: React.Dispatch<React.SetStateAction<string>>;
  editingSection: string | null;
  setEditingSection: React.Dispatch<React.SetStateAction<string | null>>;
  savingSection: boolean;
  setSavingSection: React.Dispatch<React.SetStateAction<boolean>>;
  approvedSections: Record<string, boolean>;
  setApprovedSections: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  // State: AI reviews
  aiReviews: SectionReview[];
  setAiReviews: React.Dispatch<React.SetStateAction<SectionReview[]>>;
  aiReviewsLoaded: boolean;
  setAiReviewsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  aiReviewLoading: boolean;
  setAiReviewLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // State: phase-2 wave progress
  phase2Progress: { total: number; completed: number };
  setPhase2Progress: React.Dispatch<React.SetStateAction<{ total: number; completed: number }>>;
  phase2Status: "idle" | "running" | "completed";
  setPhase2Status: React.Dispatch<React.SetStateAction<"idle" | "running" | "completed">>;

  // State: complexity
  aiSuggestedComplexity: Record<string, { rating: number; justification: string; evidence_sections?: string[] }> | null;
  setAiSuggestedComplexity: React.Dispatch<React.SetStateAction<Record<string, { rating: number; justification: string; evidence_sections?: string[] }> | null>>;

  // State: UI toggles
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

  // State: optimistic industry segment
  optimisticIndustrySegId: string | null;
  setOptimisticIndustrySegId: React.Dispatch<React.SetStateAction<string | null>>;

  // State: escrow & legal
  escrowEnabled: boolean;
  setEscrowEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  isAcceptingAllLegal: boolean;
  setIsAcceptingAllLegal: React.Dispatch<React.SetStateAction<boolean>>;

  // State: pre-flight & budget
  preFlightResult: PreFlightResult | null;
  setPreFlightResult: React.Dispatch<React.SetStateAction<PreFlightResult | null>>;
  preFlightDialogOpen: boolean;
  setPreFlightDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  budgetShortfall: BudgetShortfallResult | null;
  setBudgetShortfall: React.Dispatch<React.SetStateAction<BudgetShortfallResult | null>>;

  // State: context library
  contextLibraryOpen: boolean;
  setContextLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // State: AI quality
  aiQuality: AIQualitySummary | null;
  setAiQuality: React.Dispatch<React.SetStateAction<AIQualitySummary | null>>;
  aiQualityLoading: boolean;
  setAiQualityLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // State: locked send modal
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

  // Query results
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
  // ── useState declarations (identical order to original) ──
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
  const [aiQuality, setAiQuality] = useState<AIQualitySummary | null>(null);
  const [aiQualityLoading, setAiQualityLoading] = useState(false);
  const [lockedSendState, setLockedSendState] = useState<{
    open: boolean;
    sectionKey: string;
    sectionLabel: string;
    initialComment: string;
    aiOriginalComments: string;
  }>({ open: false, sectionKey: "", sectionLabel: "", initialComment: "", aiOriginalComments: "" });

  // ── useQuery declarations ──

  const { data: challenge, isLoading } = useQuery({
    queryKey: ["curation-review", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, problem_statement, scope, deliverables, expected_outcomes, evaluation_criteria, reward_structure, phase_schedule, complexity_score, complexity_level, complexity_parameters, complexity_locked, complexity_locked_at, complexity_locked_by, ip_model, maturity_level, visibility, eligibility, description, operating_model, governance_profile, current_phase, phase_status, domain_tags, ai_section_reviews, currency_code, hook, max_solutions, extended_brief, solver_eligibility_types, solver_visibility_types, solver_expertise_requirements, lc_review_required, targeting_filters, eligibility_model, organization_id, solution_type, solution_types, data_resources_provided, success_metrics_kpis")
        .eq("id", challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data as ChallengeData;
    },
    enabled: !!challengeId,
    placeholderData: (previousData: ChallengeData | undefined) => previousData,
  });

  const { data: orgTypeName } = useQuery({
    queryKey: ["curation-org-type", challenge?.organization_id],
    queryFn: async () => {
      const { data: org, error: orgErr } = await supabase
        .from("seeker_organizations")
        .select("organization_type_id")
        .eq("id", challenge!.organization_id)
        .single();
      if (orgErr || !org?.organization_type_id) return null;
      const { data: ot, error: otErr } = await supabase
        .from("organization_types")
        .select("name")
        .eq("id", org.organization_type_id)
        .single();
      if (otErr) return null;
      return ot?.name ?? null;
    },
    enabled: !!challenge?.organization_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: legalDocs = [] } = useQuery({
    queryKey: ["curation-legal-summary", challengeId],
    queryFn: async (): Promise<LegalDocSummary[]> => {
      const { data, error } = await supabase
        .from("challenge_legal_docs")
        .select("tier, status")
        .eq("challenge_id", challengeId!);
      if (error) return [];
      const rows = data ?? [];
      const tiers = ["TIER_1", "TIER_2"];
      return tiers.map((tier) => {
        const ofTier = rows.filter((r) => r.tier === tier);
        return {
          tier: tier === "TIER_1" ? "Tier 1: Entry-Phase" : "Tier 2: Solution-Phase",
          total: ofTier.length,
          attached: ofTier.filter((r) => r.status === "default_applied" || r.status === "custom_uploaded" || r.status === "ATTACHED").length,
        };
      });
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const { data: legalDetails = [] } = useQuery({
    queryKey: ["curation-legal-details", challengeId],
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
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const masterData = useCurationMasterData();

  const { data: sectionActions = [] } = useQuery({
    queryKey: ["curator-section-actions", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curator_section_actions" as any)
        .select("id, section_key, action_type, status, addressed_to, priority, comment_html, created_at, responded_at, response_html")
        .eq("challenge_id", challengeId!)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as unknown as Array<{
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
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  return {
    activeGroup, setActiveGroup,
    editingSection, setEditingSection,
    savingSection, setSavingSection,
    approvedSections, setApprovedSections,
    aiReviews, setAiReviews,
    aiReviewsLoaded, setAiReviewsLoaded,
    aiReviewLoading, setAiReviewLoading,
    phase2Progress, setPhase2Progress,
    phase2Status, setPhase2Status,
    aiSuggestedComplexity, setAiSuggestedComplexity,
    triageTotalCount, setTriageTotalCount,
    manualOverrides, setManualOverrides,
    expandVersion, setExpandVersion,
    highlightWarnings, setHighlightWarnings,
    showOnlyStale, setShowOnlyStale,
    guidedMode, setGuidedMode,
    dismissedPrereqBanner, setDismissedPrereqBanner,
    optimisticIndustrySegId, setOptimisticIndustrySegId,
    escrowEnabled, setEscrowEnabled,
    isAcceptingAllLegal, setIsAcceptingAllLegal,
    preFlightResult, setPreFlightResult,
    preFlightDialogOpen, setPreFlightDialogOpen,
    budgetShortfall, setBudgetShortfall,
    contextLibraryOpen, setContextLibraryOpen,
    aiQuality, setAiQuality,
    aiQualityLoading, setAiQualityLoading,
    lockedSendState, setLockedSendState,
    challenge, isLoading,
    orgTypeName,
    legalDocs, legalDetails, escrowRecord,
    masterData, sectionActions,
  };
}
