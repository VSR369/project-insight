/**
 * ApprovalPublicationConfigTab — Publication Config tab for the Approval Review page.
 *
 * Only fully interactive after ID clicks "Approve".
 * Features:
 *   1. Visibility dropdown (governance-aware: LIGHTWEIGHT shows 2, ENTERPRISE shows 4)
 *   2. Eligibility dropdown (governance-aware, validated against visibility)
 *   3. Complexity finalization sliders (same params as M-12 Step 4)
 *
 * Validation: Eligibility cannot be broader than Visibility.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { TargetingFiltersSection, EMPTY_TARGETING_FILTERS } from "@/components/cogniblend/publication/TargetingFiltersSection";
import type { TargetingFilters } from "@/components/cogniblend/publication/TargetingFiltersSection";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// --------------------------------------------------------------------------
// Types & Constants
// --------------------------------------------------------------------------

interface PublicationConfigTabProps {
  challengeId: string;
  challenge: {
    id: string;
    visibility: string | null;
    eligibility: string | null;
    eligibility_model: string | null;
    governance_profile: string | null;
    complexity_score: number | null;
    complexity_level: string | null;
    complexity_parameters: Json | null;
    max_solutions: number | null;
    submission_deadline: string | null;
    ip_model: string | null;
    targeting_filters: Json | null;
  };
  isApproved: boolean;
  onConfigChange?: (config: { visibility: string; eligibility: string; eligibilityModel: string; enrollment: string; submission: string; isReady: boolean }) => void;
}

interface TierOption {
  value: string;
  label: string;
  description: string;
  rank: number; // higher = broader
}

interface ComplexityParam {
  key: string;
  label: string;
  weight: number;
}

/* ── BRD §5.7.1 Formal Eligibility Models ───────────────── */

interface EligibilityModelOption {
  code: string;
  label: string;
  description: string;
}

const ELIGIBILITY_MODELS: EligibilityModelOption[] = [
  { code: 'OC', label: 'Open Challenge (OC)', description: 'Any solver can enroll — no restrictions. Ideal for broad innovation challenges.' },
  { code: 'DR', label: 'Direct Registered (DR)', description: 'Registered platform members with NDA acceptance. Standard for IP-sensitive challenges.' },
  { code: 'CE', label: 'Curated Expert (CE)', description: 'Verified experts at L2+ expertise. For complex, domain-specific challenges.' },
  { code: 'IO', label: 'Invite Only (IO)', description: 'Only explicitly invited solvers can participate. Maximum control over solver pool.' },
  { code: 'HY', label: 'Hybrid (HY)', description: 'Combines multiple models — e.g., CE for evaluation, OC for submission. Contact admin to configure.' },
];

interface TierOption {
  value: string;
  label: string;
  description: string;
  rank: number; // higher = broader
}

interface ComplexityParam {
  key: string;
  label: string;
  weight: number;
}

/* ── Visibility Options ─────────────────────────────────── */

const VISIBILITY_OPTIONS_ENTERPRISE: TierOption[] = [
  { value: "invite_only", label: "Invite Only", description: "Specific invitees can view this challenge", rank: 1 },
  { value: "curated_experts", label: "Curated Experts", description: "Verified experts on the platform only", rank: 2 },
  { value: "registered_users", label: "Registered Users", description: "Platform members only", rank: 3 },
  { value: "public", label: "Public", description: "Anyone on the internet can view this challenge", rank: 4 },
];

const VISIBILITY_OPTIONS_LIGHTWEIGHT: TierOption[] = [
  { value: "invite_only", label: "Invite Only", description: "Specific invitees can view this challenge", rank: 1 },
  { value: "public", label: "Public", description: "Anyone on the internet can view this challenge", rank: 4 },
];

/* ── Enrollment Options ─────────────────────────────────── */

const ENROLLMENT_OPTIONS_ENTERPRISE: TierOption[] = [
  { value: "invitation_only", label: "Invitation Only", description: "Only invited solvers can enroll", rank: 1 },
  { value: "org_curated", label: "Organization-Curated", description: "Enrollment requires org approval", rank: 2 },
  { value: "curator_approved", label: "Curator-Approved", description: "Curator reviews enrollment requests", rank: 3 },
  { value: "open_auto", label: "Open Enrollment", description: "Anyone eligible can auto-enroll", rank: 4 },
];

const ENROLLMENT_OPTIONS_LIGHTWEIGHT: TierOption[] = [
  { value: "invitation_only", label: "Invitation Only", description: "Only invited solvers can enroll", rank: 1 },
  { value: "open_auto", label: "Open Enrollment", description: "Anyone eligible can auto-enroll", rank: 4 },
];

/* ── Submission Options ─────────────────────────────────── */

const SUBMISSION_OPTIONS_ENTERPRISE: TierOption[] = [
  { value: "invited_solvers", label: "Invited Solvers Only", description: "Only specifically invited solvers can submit", rank: 1 },
  { value: "shortlisted_only", label: "Shortlisted Only", description: "Only shortlisted participants can submit", rank: 2 },
  { value: "all_enrolled", label: "All Enrolled Participants", description: "Any enrolled solver can submit", rank: 3 },
];

const SUBMISSION_OPTIONS_LIGHTWEIGHT: TierOption[] = [
  { value: "invited_solvers", label: "Invited Only", description: "Only specifically invited solvers can submit", rank: 1 },
  { value: "all_enrolled", label: "All Enrolled", description: "Any enrolled solver can submit", rank: 3 },
];

/* ── Legacy Eligibility Options (backward compatibility) ── */

const ELIGIBILITY_OPTIONS_ENTERPRISE: TierOption[] = [
  { value: "invited_experts", label: "Invited Experts Only", description: "Only specifically invited experts can submit", rank: 1 },
  { value: "curated_experts", label: "Curated Experts Only", description: "Verified experts on the platform can submit", rank: 2 },
  { value: "registered_users", label: "Registered Users", description: "Any registered platform member can submit", rank: 3 },
  { value: "anyone", label: "Anyone (Open)", description: "Open to all — no restrictions on who can submit", rank: 4 },
];

const ELIGIBILITY_OPTIONS_LIGHTWEIGHT: TierOption[] = [
  { value: "invited_experts", label: "Invited Only", description: "Only specifically invited experts can submit", rank: 1 },
  { value: "anyone", label: "Anyone", description: "Open to all — no restrictions on who can submit", rank: 4 },
];

const COMPLEXITY_PARAMS: ComplexityParam[] = [
  { key: "technical_novelty", label: "Technical Novelty", weight: 0.20 },
  { key: "solution_maturity", label: "Solution Maturity", weight: 0.15 },
  { key: "domain_breadth", label: "Domain Breadth", weight: 0.15 },
  { key: "evaluation_complexity", label: "Evaluation Complexity", weight: 0.15 },
  { key: "ip_sensitivity", label: "IP Sensitivity", weight: 0.15 },
  { key: "timeline_urgency", label: "Timeline Urgency", weight: 0.10 },
  { key: "budget_scale", label: "Budget Scale", weight: 0.10 },
];

function getComplexityLevel(score: number): { label: string; level: string; colorClass: string } {
  if (score < 2.0) return { label: "L1", level: "Low", colorClass: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (score < 4.0) return { label: "L2", level: "Low-Medium", colorClass: "bg-blue-100 text-blue-800 border-blue-300" };
  if (score < 6.0) return { label: "L3", level: "Medium", colorClass: "bg-amber-100 text-amber-800 border-amber-300" };
  if (score < 8.0) return { label: "L4", level: "High", colorClass: "bg-orange-100 text-orange-800 border-orange-300" };
  return { label: "L5", level: "Very High", colorClass: "bg-red-100 text-red-800 border-red-300" };
}

function parseJson<T>(val: Json | null): T | null {
  if (!val) return null;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  return val as T;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Get maximum allowed tier rank based on parent tier rank.
 * Child tier cannot be broader (higher rank) than parent.
 */
function getMaxTierRank(parentValue: string, parentOptions: TierOption[]): number {
  const opt = parentOptions.find((v) => v.value === parentValue);
  return opt?.rank ?? 0;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export default function ApprovalPublicationConfigTab({
  challengeId,
  challenge,
  isApproved,
  onConfigChange,
}: PublicationConfigTabProps) {
  // ══════════════════════════════════════
  // SECTION 1: State
  // ══════════════════════════════════════
  const [visibility, setVisibility] = useState(challenge.visibility || "");
  const [eligibility, setEligibility] = useState(challenge.eligibility || "");
  const [eligibilityModel, setEligibilityModel] = useState(challenge.eligibility_model || "");
  const [enrollment, setEnrollment] = useState(challenge.challenge_enrollment || "");
  const [submission, setSubmission] = useState(challenge.challenge_submission || "");
  const [complexityFinalized, setComplexityFinalized] = useState(false);
  const [targetingFilters, setTargetingFilters] = useState<TargetingFilters>(() => {
    const existing = parseJson<TargetingFilters>(challenge.targeting_filters);
    return existing ?? EMPTY_TARGETING_FILTERS;
  });

  // Complexity slider values
  const existingParams = parseJson<Record<string, number>>(challenge.complexity_parameters) ?? {};
  const [paramValues, setParamValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    COMPLEXITY_PARAMS.forEach((p) => {
      initial[p.key] = existingParams[p.key] ?? 5;
    });
    return initial;
  });

  // ══════════════════════════════════════
  // SECTION 2: Auth & hooks
  // ══════════════════════════════════════
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ══════════════════════════════════════
  // SECTION 3: Computed values
  // ══════════════════════════════════════
  const isEnterprise = challenge.governance_profile?.toUpperCase() === "ENTERPRISE";

  const visibilityOptions = isEnterprise ? VISIBILITY_OPTIONS_ENTERPRISE : VISIBILITY_OPTIONS_LIGHTWEIGHT;
  const eligibilityOptions = isEnterprise ? ELIGIBILITY_OPTIONS_ENTERPRISE : ELIGIBILITY_OPTIONS_LIGHTWEIGHT;
  const enrollmentOptions = isEnterprise ? ENROLLMENT_OPTIONS_ENTERPRISE : ENROLLMENT_OPTIONS_LIGHTWEIGHT;
  const submissionOptions = isEnterprise ? SUBMISSION_OPTIONS_ENTERPRISE : SUBMISSION_OPTIONS_LIGHTWEIGHT;

  const maxEligRank = useMemo(
    () => getMaxTierRank(visibility, visibilityOptions),
    [visibility, visibilityOptions]
  );

  const maxEnrollRank = useMemo(
    () => getMaxTierRank(visibility, visibilityOptions),
    [visibility, visibilityOptions]
  );

  const maxSubmissionRank = useMemo(
    () => getMaxTierRank(enrollment, enrollmentOptions),
    [enrollment, enrollmentOptions]
  );

  const validationError = useMemo(() => {
    if (!visibility || !eligibility) return null;
    const eligOpt = eligibilityOptions.find((e) => e.value === eligibility);
    if (eligOpt && eligOpt.rank > maxEligRank) {
      return "Eligibility cannot be broader than visibility. Solvers must be able to see the challenge to submit.";
    }
    return null;
  }, [visibility, eligibility, maxEligRank, eligibilityOptions]);

  const enrollmentError = useMemo(() => {
    if (!isEnterprise || !visibility || !enrollment) return null;
    const enrOpt = enrollmentOptions.find((e) => e.value === enrollment);
    if (enrOpt && enrOpt.rank > maxEnrollRank) {
      return "Enrollment cannot be broader than visibility.";
    }
    return null;
  }, [isEnterprise, visibility, enrollment, maxEnrollRank, enrollmentOptions]);

  const submissionError = useMemo(() => {
    if (!isEnterprise || !enrollment || !submission) return null;
    const subOpt = submissionOptions.find((s) => s.value === submission);
    if (subOpt && subOpt.rank > maxSubmissionRank) {
      return "Submission tier cannot be broader than enrollment tier.";
    }
    return null;
  }, [isEnterprise, enrollment, submission, maxSubmissionRank, submissionOptions]);

  const complexityScore = useMemo(
    () => COMPLEXITY_PARAMS.reduce((sum, p) => sum + (paramValues[p.key] ?? 5) * p.weight, 0),
    [paramValues]
  );

  const complexityInfo = useMemo(() => getComplexityLevel(complexityScore), [complexityScore]);

  // Notify parent of configuration readiness
  const hasAccessErrors = !!validationError || !!enrollmentError || !!submissionError;
  const isConfigReady = !!visibility && !!eligibility && !!eligibilityModel && !hasAccessErrors && complexityFinalized;
  useEffect(() => {
    onConfigChange?.({ visibility, eligibility, eligibilityModel, enrollment, submission, isReady: isConfigReady });
  }, [visibility, eligibility, eligibilityModel, enrollment, submission, isConfigReady, onConfigChange]);

  // ══════════════════════════════════════
  // SECTION 4: Mutation — finalize complexity
  // ══════════════════════════════════════
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("challenges")
        .update({
          complexity_parameters: paramValues as unknown as Json,
          complexity_score: parseFloat(complexityScore.toFixed(1)),
          complexity_level: complexityInfo.level,
          updated_by: user?.id ?? null,
        })
        .eq("id", challengeId);
      if (error) throw new Error(error.message);

      // Audit trail
      await supabase.rpc("log_audit", {
        p_user_id: user?.id ?? "",
        p_challenge_id: challengeId,
        p_solution_id: "",
        p_action: "COMPLEXITY_FINALIZED",
        p_method: "UI",
        p_details: {
          complexity_score: parseFloat(complexityScore.toFixed(1)),
          complexity_level: complexityInfo.level,
          parameters: paramValues,
        } as unknown as Json,
      });
    },
    onSuccess: () => {
      setComplexityFinalized(true);
      queryClient.invalidateQueries({ queryKey: ["approval-review", challengeId] });
      toast.success("Complexity assessment finalized");
    },
    onError: (error: Error) => {
      toast.error(`Failed to finalize complexity: ${error.message}`);
    },
  });

  // ══════════════════════════════════════
  // SECTION 5: Handlers
  // ══════════════════════════════════════
  const handleSliderChange = useCallback((key: string, value: number[]) => {
    if (complexityFinalized) return;
    setParamValues((prev) => ({ ...prev, [key]: value[0] }));
  }, [complexityFinalized]);

  /** Auto-correct child tiers when parent changes */
  const autoCorrectChildTier = (
    parentValue: string,
    parentOptions: TierOption[],
    childValue: string,
    childOptions: TierOption[],
    setChild: (v: string) => void,
  ) => {
    const maxRank = getMaxTierRank(parentValue, parentOptions);
    const childOpt = childOptions.find((c) => c.value === childValue);
    if (childOpt && childOpt.rank > maxRank) {
      const valid = childOptions.filter((c) => c.rank <= maxRank);
      if (valid.length > 0) setChild(valid[0].value);
    }
  };

  const handleVisibilityChange = useCallback((val: string) => {
    setVisibility(val);
    autoCorrectChildTier(val, visibilityOptions, eligibility, eligibilityOptions, setEligibility);
    if (isEnterprise) {
      autoCorrectChildTier(val, visibilityOptions, enrollment, enrollmentOptions, setEnrollment);
    }
  }, [eligibility, eligibilityOptions, visibilityOptions, enrollment, enrollmentOptions, isEnterprise]);

  const handleEnrollmentChange = useCallback((val: string) => {
    setEnrollment(val);
    if (isEnterprise) {
      autoCorrectChildTier(val, enrollmentOptions, submission, submissionOptions, setSubmission);
    }
  }, [enrollmentOptions, submission, submissionOptions, isEnterprise]);
  // ══════════════════════════════════════
  // SECTION 6: Render — not approved yet
  // ══════════════════════════════════════
  if (!isApproved) {
    return (
      <div className="space-y-6">
        {/* Read-only summary of current settings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Publication Configuration</CardTitle>
            <p className="text-xs text-muted-foreground">
              Review the current settings. Configuration will be editable after you approve this challenge.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-border rounded-lg p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Visibility</p>
                <p className="text-sm font-medium text-foreground capitalize">{challenge.visibility || "Not set"}</p>
              </div>
              <div className="border border-border rounded-lg p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Eligibility</p>
                <p className="text-sm font-medium text-foreground capitalize">{challenge.eligibility || "Not set"}</p>
              </div>
              {isEnterprise && (
                <>
                  <div className="border border-border rounded-lg p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Enrollment Model</p>
                    <p className="text-sm font-medium text-foreground capitalize">{challenge.challenge_enrollment || "Not set"}</p>
                  </div>
                  <div className="border border-border rounded-lg p-4 space-y-1">
                    <p className="text-xs text-muted-foreground">Submission Tier</p>
                    <p className="text-sm font-medium text-foreground capitalize">{challenge.challenge_submission || "Not set"}</p>
                  </div>
                </>
              )}
              <div className="border border-border rounded-lg p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Max Solutions</p>
                <p className="text-sm font-medium text-foreground">{challenge.max_solutions ?? "Unlimited"}</p>
              </div>
              <div className="border border-border rounded-lg p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Submission Deadline</p>
                <p className="text-sm font-medium text-foreground">
                  {challenge.submission_deadline ? formatDate(challenge.submission_deadline) : "Not set"}
                </p>
              </div>
              <div className="border border-border rounded-lg p-4 space-y-1">
                <p className="text-xs text-muted-foreground">IP Model</p>
                <p className="text-sm font-medium text-foreground">{challenge.ip_model || "Not set"}</p>
              </div>
              <div className="border border-border rounded-lg p-4 space-y-1">
                <p className="text-xs text-muted-foreground">Governance Profile</p>
                <p className="text-sm font-medium text-foreground capitalize">{challenge.governance_profile || "Not set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="pt-6 flex items-center justify-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Publication settings will become editable after you approve this challenge.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ══════════════════════════════════════
  // SECTION 7: Render — approved (interactive)
  // ══════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Visibility Dropdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Audience & Access</CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure who can see and submit solutions to this challenge.
            {!isEnterprise && (
              <span className="ml-1 text-primary font-medium">Lightweight mode — limited options per BR-GOV-006.</span>
            )}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Visibility */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Who can see this challenge?</Label>
            <Select value={visibility} onValueChange={handleVisibilityChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="py-1">
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Eligibility */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Who can submit solutions?</Label>
            <Select value={eligibility} onValueChange={setEligibility}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select eligibility" />
              </SelectTrigger>
              <SelectContent>
                {eligibilityOptions.map((opt) => {
                  const isDisabled = opt.rank > maxEligRank;
                  return (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      disabled={isDisabled}
                    >
                      <div className="py-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${isDisabled ? "text-muted-foreground/50" : ""}`}>
                            {opt.label}
                          </p>
                          {isDisabled && (
                            <span className="text-[10px] text-destructive font-medium">Restricted</span>
                          )}
                        </div>
                        <p className={`text-xs ${isDisabled ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                          {opt.description}
                        </p>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Validation error */}
            {validationError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive font-medium">{validationError}</p>
              </div>
            )}
          </div>

          {/* ── Eligibility Model (BRD §5.7.1) ─── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Solver Eligibility Model</Label>
            <p className="text-xs text-muted-foreground">
              Defines the enrollment flow solvers must follow. Maps to BRD §5.7.1 codes.
            </p>
            <Select value={eligibilityModel} onValueChange={setEligibilityModel}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select eligibility model" />
              </SelectTrigger>
              <SelectContent>
                {ELIGIBILITY_MODELS.map((model) => (
                  <SelectItem key={model.code} value={model.code}>
                    <div className="py-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{model.label}</p>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{model.code}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{model.description}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Enrollment Tier (Enterprise only) ─── */}
          {isEnterprise && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">How can solvers enroll?</Label>
              <Select value={enrollment} onValueChange={handleEnrollmentChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select enrollment model" />
                </SelectTrigger>
                <SelectContent>
                  {enrollmentOptions.map((opt) => {
                    const isDisabled = opt.rank > maxEnrollRank;
                    return (
                      <SelectItem key={opt.value} value={opt.value} disabled={isDisabled}>
                        <div className="py-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isDisabled ? "text-muted-foreground/50" : ""}`}>{opt.label}</p>
                            {isDisabled && <span className="text-[10px] text-destructive font-medium">Restricted</span>}
                          </div>
                          <p className={`text-xs ${isDisabled ? "text-muted-foreground/40" : "text-muted-foreground"}`}>{opt.description}</p>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {enrollmentError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive font-medium">{enrollmentError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Submission Tier (Enterprise only) ─── */}
          {isEnterprise && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Who can submit solutions?</Label>
              <Select value={submission} onValueChange={setSubmission}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select submission tier" />
                </SelectTrigger>
                <SelectContent>
                  {submissionOptions.map((opt) => {
                    const isDisabled = opt.rank > maxSubmissionRank;
                    return (
                      <SelectItem key={opt.value} value={opt.value} disabled={isDisabled}>
                        <div className="py-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium ${isDisabled ? "text-muted-foreground/50" : ""}`}>{opt.label}</p>
                            {isDisabled && <span className="text-[10px] text-destructive font-medium">Restricted</span>}
                          </div>
                          <p className={`text-xs ${isDisabled ? "text-muted-foreground/40" : "text-muted-foreground"}`}>{opt.description}</p>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {submissionError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive font-medium">{submissionError}</p>
                </div>
              )}
            </div>
          )}

          {/* ── 3-Tier Hierarchy Indicator (Enterprise) ─── */}
          {isEnterprise && visibility && enrollment && submission && !hasAccessErrors && (
            <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
              <p className="text-[11px] font-semibold text-foreground">Access Model Hierarchy</p>
              <p className="text-[11px] text-muted-foreground">
                Visibility ({visibilityOptions.find(v => v.value === visibility)?.label})
                {' → '}
                Enrollment ({enrollmentOptions.find(e => e.value === enrollment)?.label})
                {' → '}
                Submission ({submissionOptions.find(s => s.value === submission)?.label})
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Targeting Filters */}
      <Card>
        <CardContent className="pt-6">
          <TargetingFiltersSection
            value={targetingFilters}
            onChange={setTargetingFilters}
            isLightweight={!isEnterprise}
          />
        </CardContent>
      </Card>

      {/* Complexity Finalization */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Complexity Finalization</CardTitle>
            {complexityFinalized && (
              <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 border-green-200 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Finalized by ID
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {complexityFinalized
              ? "Complexity has been finalized. Values are now read-only."
              : "Adjust the complexity parameters and finalize before publication."
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Score display */}
          <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{complexityScore.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Score</p>
            </div>
            <div>
              <Badge className={`${complexityInfo.colorClass} border text-xs font-semibold`}>
                {complexityInfo.label} — {complexityInfo.level}
              </Badge>
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            {COMPLEXITY_PARAMS.map((param) => (
              <div key={param.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">{param.label}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Weight: {(param.weight * 100).toFixed(0)}%</span>
                    <span className="text-sm font-semibold text-foreground w-6 text-right">
                      {paramValues[param.key] ?? 5}
                    </span>
                  </div>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={[paramValues[param.key] ?? 5]}
                  onValueChange={(val) => handleSliderChange(param.key, val)}
                  disabled={complexityFinalized}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            ))}
          </div>

          {/* Finalize button */}
          {!complexityFinalized && (
            <Button
              className="w-full"
              onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              )}
              Finalize Complexity
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Other publication settings (read-only context) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Other Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Max Solutions</p>
              <p className="text-sm font-medium text-foreground">{challenge.max_solutions ?? "Unlimited"}</p>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Submission Deadline</p>
              <p className="text-sm font-medium text-foreground">
                {challenge.submission_deadline ? formatDate(challenge.submission_deadline) : "Not set"}
              </p>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">IP Model</p>
              <p className="text-sm font-medium text-foreground">{challenge.ip_model || "Not set"}</p>
            </div>
            <div className="border border-border rounded-lg p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Governance Profile</p>
              <p className="text-sm font-medium text-foreground capitalize">{challenge.governance_profile || "Not set"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
