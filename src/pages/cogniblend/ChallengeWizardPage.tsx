/**
 * ChallengeWizardPage — 8-step Challenge Creation / Edit wizard (Advanced Editor).
 * Route: /cogni/challenges/new  |  /cogni/challenges/:id/edit
 *
 * Steps:
 *   0. Mode & Model Selection
 *   1. Challenge Brief
 *   2. Evaluation Criteria
 *   3. Rewards & Payment
 *   4. Timeline & Phase Schedule
 *   5. Provider Eligibility
 *   6. Templates
 *   7. Review & Submit
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Save, PauseCircle, XCircle, ChevronDown, ChevronRight, FileText } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { useRoleReadinessGate } from '@/hooks/cogniblend/useRoleReadinessGate';
import { SubmissionBlockedScreen } from '@/components/rbac/SubmissionBlockedScreen';
import { useChallengeDetail, useMandatoryFields, useSaveChallengeStep, useSubmitChallengeForReview } from '@/hooks/queries/useChallengeForm';
import { useSubmitSolutionRequest } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useGovernanceFieldRules } from '@/hooks/queries/useGovernanceFieldRules';
import { resolveGovernanceMode, isQuickMode, isEnterpriseGrade, type GovernanceMode } from '@/lib/governanceMode';
import { GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';
import { ChallengeProgressBar } from '@/components/cogniblend/challenge-wizard/ChallengeProgressBar';
import { ChallengeWizardBottomBar } from '@/components/cogniblend/challenge-wizard/ChallengeWizardBottomBar';
import { StepProblem } from '@/components/cogniblend/challenge-wizard/StepProblem';
import { StepEvaluation } from '@/components/cogniblend/challenge-wizard/StepEvaluation';
import { StepRewards } from '@/components/cogniblend/challenge-wizard/StepRewards';
import { StepTimeline } from '@/components/cogniblend/challenge-wizard/StepTimeline';
import { StepProviderEligibility } from '@/components/cogniblend/challenge-wizard/StepProviderEligibility';
import { StepTemplates } from '@/components/cogniblend/challenge-wizard/StepTemplates';
import { StepReviewSubmit } from '@/components/cogniblend/challenge-wizard/StepReviewSubmit';
import { StepModeSelection } from '@/components/cogniblend/challenge-wizard/StepModeSelection';
import { ChallengeSubmitSummaryModal } from '@/components/cogniblend/challenge-wizard/ChallengeSubmitSummaryModal';
import { FormCompletionBar } from '@/components/cogniblend/challenge-wizard/FormCompletionBar';
import { useFormCompletion } from '@/components/cogniblend/challenge-wizard/useFormCompletion';
import {
  createChallengeFormSchema,
  DEFAULT_FORM_VALUES,
  type ChallengeFormValues,
} from '@/components/cogniblend/challenge-wizard/challengeFormSchema';

const TOTAL_STEPS = 7; // Steps 0–7 (8 total)

const BUSINESS_RULES = [
  'BR-CC-001: Challenge must have a minimum problem statement length',
  'BR-CC-002: Evaluation criteria weights must sum to 100%',
  'BR-CC-003: Reward structure requires Platinum > Gold > Silver ordering',
  'BR-CC-004: Submission deadline must be in the future',
  'BR-CC-005: At least one solver eligibility type required',
  'BR-CC-006: Enterprise challenges require legal document attachment',
  'BR-CC-007: Phase schedule durations must be within SLA bounds',
  'BR-CC-008: Targeting filters must be compatible with visibility tier',
  'BR-CC-009: Draft SLA is 10 business days from creation',
];

interface ChallengeWizardPageProps {
  /** When true, rendered inside unified ChallengeCreatePage tabs */
  embedded?: boolean;
  /** Switch back to AI intake tab (only used when embedded) */
  onSwitchToSimple?: () => void;
  /** Shared state from AI intake (problem, maturity, template, generatedSpec) */
  initialFromIntake?: SharedIntakeState;
}

export default function ChallengeWizardPage({ embedded = false, onSwitchToSimple, initialFromIntake }: ChallengeWizardPageProps = {}) {
  // ═══════ Hooks — state ═══════
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showTierLimit, setShowTierLimit] = useState(false);
  const [showBusinessRules, setShowBusinessRules] = useState(false);

  // ═══════ Hooks — context ═══════
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: challengeId } = useParams<{ id: string }>();
  const isEditMode = !!challengeId;

  // ═══════ Hooks — queries ═══════
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext } = useOrgModelContext();
  const { data: challengeData, isLoading: challengeLoading } = useChallengeDetail(challengeId);
  const { data: tierLimit, isLoading: tierLimitLoading } = useTierLimitCheck();
  const readinessGate = useRoleReadinessGate();

  const isAggBypass = orgContext?.operatingModel === 'AGG' && orgContext?.phase1Bypass;

  // Resolve governance fallback from org or existing challenge
  const rawGovernanceProfile = isEditMode
    ? challengeData?.governance_profile ?? null
    : (currentOrg as any)?.governanceProfile ?? null;

  const fallbackMode: GovernanceMode = resolveGovernanceMode(rawGovernanceProfile);
  const governanceProfile = rawGovernanceProfile; // keep for legacy prop passing

  // ═══════ Hooks — form (must be before watch) ═══════
  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(createChallengeFormSchema(fallbackMode)),
    defaultValues: {
      ...DEFAULT_FORM_VALUES,
      governance_mode: fallbackMode,
      operating_model: (orgContext?.operatingModel as 'MP' | 'AGG') ?? 'MP',
    },
  });

  // Use form-selected mode (Step 0) or fallback
  const formSelectedMode = form.watch('governance_mode') as GovernanceMode | undefined;
  const governanceMode: GovernanceMode = formSelectedMode ?? fallbackMode;
  const isLightweight = isQuickMode(governanceMode);

  // Fetch DB-driven field rules for this governance mode
  const { data: fieldRules, isLoading: fieldRulesLoading } = useGovernanceFieldRules(governanceMode);

  const { data: mandatoryFields = [], isLoading: fieldsLoading } = useMandatoryFields(governanceProfile);
  const formCompletion = useFormCompletion(form, governanceMode);

  // ═══════ Hooks — mutations ═══════
  const createChallengeMutation = useSubmitSolutionRequest();
  const saveStepMutation = useSaveChallengeStep();
  const submitMutation = useSubmitChallengeForReview();

  // ═══════ Hooks — effects ═══════
  useEffect(() => {
    if (challengeData && isEditMode) {
      const deliverables = challengeData.deliverables as any;
      form.reset({
        title: challengeData.title ?? '',
        description: challengeData.description ?? '',
        problem_statement: challengeData.problem_statement ?? '',
        scope: challengeData.scope ?? '',
        domain_tags: [],
        deliverables_list: Array.isArray(deliverables?.items) ? deliverables.items : [''],
        maturity_level: (challengeData.maturity_level as ChallengeFormValues['maturity_level']) ?? undefined as unknown as 'blueprint',
        ip_model: challengeData.ip_model ?? '',
        eligibility: challengeData.eligibility ?? '',
        complexity_notes: '',
        // New Step 1 fields from JSONB
        context_background: deliverables?.context_background ?? '',
        detailed_description: deliverables?.detailed_description ?? '',
        root_causes: deliverables?.root_causes ?? '',
        affected_stakeholders: deliverables?.affected_stakeholders ?? '',
        current_deficiencies: deliverables?.current_deficiencies ?? '',
        expected_outcomes: deliverables?.expected_outcomes ?? '',
        preferred_approach: deliverables?.preferred_approach ?? '',
        approaches_not_of_interest: deliverables?.approaches_not_of_interest ?? '',
        industry_segment_id: (challengeData.eligibility as any)?.industry_segment_id ?? '',
        experience_countries: (challengeData.eligibility as any)?.experience_countries ?? [],
        weighted_criteria: Array.isArray((challengeData.evaluation_criteria as any)?.criteria)
          ? (challengeData.evaluation_criteria as any).criteria.map((c: any) => ({
              name: c.name ?? c ?? '',
              weight: c.weight ?? 0,
              description: c.description ?? '',
              rubrics: c.rubrics ?? undefined,
            }))
          : [
              { name: 'Technical Approach & Innovation', weight: 30, description: '' },
              { name: 'SAP Integration Feasibility', weight: 20, description: '' },
              { name: 'Accuracy & Performance', weight: 25, description: '' },
              { name: 'Implementation Plan', weight: 15, description: '' },
              { name: 'Team Experience', weight: 10, description: '' },
            ],
        currency_code: challengeData.currency_code ?? 'USD',
        platinum_award: (challengeData.reward_structure as any)?.platinum ?? 0,
        gold_award: (challengeData.reward_structure as any)?.gold ?? 0,
        silver_award: (challengeData.reward_structure as any)?.silver ?? undefined,
        num_rewarded_solutions: (challengeData.reward_structure as any)?.num_rewarded ?? '3',
        payment_mode: (challengeData.reward_structure as any)?.payment_mode ?? 'escrow',
        payment_milestones: Array.isArray((challengeData.reward_structure as any)?.payment_milestones)
          ? (challengeData.reward_structure as any).payment_milestones
          : [
              { name: 'Abstract Shortlisted', pct: 10, trigger: 'on_shortlisting' },
              { name: 'Full Solution Submitted', pct: 30, trigger: 'on_full_submission' },
              { name: 'Solution Selected', pct: 60, trigger: 'on_selection' },
            ],
        rejection_fee_pct: (challengeData as any)?.rejection_fee_percentage ?? 10,
        submission_guidelines: deliverables?.submission_guidelines ?? '',
        submission_template_url: (challengeData as any)?.submission_template_url ?? '',
        taxonomy_tags: '',
        submission_deadline: challengeData.submission_deadline
          ? challengeData.submission_deadline.substring(0, 16)
          : '',
        expected_timeline: (challengeData.phase_schedule as any)?.expected_timeline ?? '',
        review_duration: undefined,
        phase_notes: '',
        solver_eligibility_id: (challengeData as any)?.solver_eligibility_id ?? '',
        permitted_artifact_types: deliverables?.permitted_artifact_types ?? [],
        phase_durations: (challengeData.phase_schedule as any)?.phase_durations ?? undefined,
        complexity_params: (challengeData.complexity_parameters as any) ?? undefined,
        challenge_visibility: (challengeData as any)?.challenge_visibility ?? '',
        challenge_enrollment: (challengeData as any)?.challenge_enrollment ?? '',
        challenge_submission: (challengeData as any)?.challenge_submission ?? '',
        targeting_filters: (challengeData as any)?.targeting_filters ?? {
          industries: [], geographies: [], expertise_domains: [], certifications: [],
          languages: [], min_solver_rating: 'any', past_performance: 'any', solver_cluster: 'any',
        },
      });
    }
  }, [challengeData, isEditMode, form]);

  useEffect(() => {
    if (!isEditMode && tierLimit && !tierLimit.allowed) {
      setShowTierLimit(true);
    }
  }, [isEditMode, tierLimit]);

  // ═══════ Conditional returns ═══════
  if (orgLoading || (isEditMode && challengeLoading) || fieldsLoading || fieldRulesLoading || (!isEditMode && tierLimitLoading) || (!isEditMode && readinessGate.isLoading)) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!isEditMode && !readinessGate.isReady) {
    return (
      <SubmissionBlockedScreen
        orgId={readinessGate.orgId}
        model={readinessGate.model}
        onBack={() => navigate('/cogni/dashboard')}
      />
    );
  }

  if (!isEditMode && tierLimit && !tierLimit.allowed) {
    return (
      <div className="max-w-3xl mx-auto">
        <TierLimitModal
          isOpen={showTierLimit}
          onClose={() => { setShowTierLimit(false); navigate('/cogni/dashboard'); }}
          tierName={tierLimit.tier_name}
          maxAllowed={tierLimit.max_allowed}
          currentActive={tierLimit.current_active}
        />
      </div>
    );
  }

  // ═══════ Derived ═══════
  const isEnterprise = isEnterpriseGrade(governanceMode);
  const modeConfig = GOVERNANCE_MODE_CONFIG[governanceMode];
  const pageTitle = isEditMode ? 'Edit Challenge' : 'Creating New Challenge';
  const sourceRequest = (challengeData?.phase_schedule as any)?.source_request_context;

  // Calculate draft SLA (10 business days)
  const createdAt = (challengeData as any)?.created_at ? new Date((challengeData as any).created_at) : new Date();
  const slaDays = 10;
  const slaDeadline = new Date(createdAt);
  slaDeadline.setDate(slaDeadline.getDate() + slaDays);
  const daysRemaining = Math.max(0, Math.ceil((slaDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  // ═══════ Helpers ═══════
  const buildFieldsFromForm = (values: ChallengeFormValues) => {
    const deliverableItems = values.deliverables_list.filter(Boolean);
    const criteria = values.weighted_criteria.filter((c) => c.name);

    const weights = [0.20, 0.15, 0.15, 0.15, 0.15, 0.10, 0.10];
    const paramKeys = ['technical_novelty', 'solution_maturity', 'domain_breadth', 'evaluation_complexity', 'ip_sensitivity', 'timeline_urgency', 'budget_scale'];
    let complexityScore: number | null = null;
    let complexityLevel: string | null = null;

    if (values.complexity_params) {
      complexityScore = paramKeys.reduce((sum, key, i) => {
        return sum + ((values.complexity_params as any)?.[key] ?? 5) * weights[i];
      }, 0);
      if (complexityScore < 2) complexityLevel = 'L1';
      else if (complexityScore < 4) complexityLevel = 'L2';
      else if (complexityScore < 6) complexityLevel = 'L3';
      else if (complexityScore < 8) complexityLevel = 'L4';
      else complexityLevel = 'L5';
    } else if (values.complexity_notes) {
      const lwMap: Record<string, { level: string; score: number }> = {
        low: { level: 'L1', score: 2.0 },
        medium: { level: 'L3', score: 5.0 },
        high: { level: 'L5', score: 9.0 },
      };
      const mapped = lwMap[values.complexity_notes];
      if (mapped) { complexityLevel = mapped.level; complexityScore = mapped.score; }
    }

    return {
      title: values.title,
      description: values.description || null,
      problem_statement: values.problem_statement || null,
      scope: values.scope || null,
      deliverables: {
        items: deliverableItems,
        permitted_artifact_types: values.permitted_artifact_types ?? [],
        // Store new rich-text fields in deliverables JSONB
        context_background: values.context_background || null,
        detailed_description: values.detailed_description || null,
        root_causes: values.root_causes || null,
        affected_stakeholders: values.affected_stakeholders || null,
        current_deficiencies: values.current_deficiencies || null,
        expected_outcomes: values.expected_outcomes || null,
        preferred_approach: values.preferred_approach || null,
        approaches_not_of_interest: values.approaches_not_of_interest || null,
        submission_guidelines: values.submission_guidelines || null,
      },
      evaluation_criteria: criteria.length ? { criteria } : null,
      reward_structure: isLightweight
        ? values.reward_type === 'non_monetary'
          ? { type: 'non_monetary', description: values.reward_description || '' }
          : { type: 'monetary', amount: values.platinum_award, currency: values.currency_code }
        : {
            currency: values.currency_code,
            platinum: values.platinum_award,
            gold: values.gold_award,
            silver: values.silver_award ?? null,
            num_rewarded: values.num_rewarded_solutions ?? '3',
            payment_mode: values.payment_mode ?? 'escrow',
            payment_milestones: values.payment_milestones ?? [],
          },
      maturity_level: values.maturity_level || null,
      ip_model: values.ip_model || null,
      hook: (values as any).hook || null,
      effort_level: (values as any).effort_level || null,
      eligibility: values.eligibility || null,
      solver_eligibility_id: values.solver_eligibility_id || null,
      solver_eligibility_types: values.eligible_participation_modes?.length
        ? values.eligible_participation_modes
        : null,
      challenge_visibility: isLightweight ? null : (values.challenge_visibility || 'public'),
      challenge_enrollment: isLightweight ? null : (values.challenge_enrollment || 'open_auto'),
      challenge_submission: isLightweight ? null : (values.challenge_submission || 'all_enrolled'),
      rejection_fee_percentage: values.rejection_fee_pct,
      submission_deadline: values.submission_deadline || null,
      submission_template_url: values.submission_template_url || null,
      phase_schedule: {
        expected_timeline: values.expected_timeline || null,
        review_duration: values.review_duration || null,
        notes: values.phase_notes || null,
        phase_durations: values.phase_durations || null,
        source_request_context: sourceRequest || null,
      },
      complexity_parameters: values.complexity_params || null,
      complexity_score: complexityScore,
      complexity_level: complexityLevel,
      targeting_filters: values.targeting_filters || {},
    };
  };

  // ═══════ Cross-step validation ═══════
  const validateAllSteps = async (): Promise<{ valid: boolean; firstErrorStep: number | null }> => {
    const allFields = [];
    for (let s = 0; s <= TOTAL_STEPS; s++) {
      allFields.push(...getStepFields(s));
    }
    const isValid = await form.trigger(allFields as any);
    if (!isValid) {
      for (let step = 0; step <= TOTAL_STEPS; step++) {
        const stepFields = getStepFields(step);
        if (stepFields.length === 0) continue;
        const stepValid = await form.trigger(stepFields as any);
        if (!stepValid) return { valid: false, firstErrorStep: step };
      }
    }
    const criteria = form.getValues('weighted_criteria');
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight !== 100) return { valid: false, firstErrorStep: 2 };
    const platinum = form.getValues('platinum_award');
    const gold = form.getValues('gold_award');
    const silver = form.getValues('silver_award');
    if (platinum <= 0 || gold <= 0 || platinum <= gold) return { valid: false, firstErrorStep: 3 };
    if (silver !== undefined && silver > 0 && gold <= silver) return { valid: false, firstErrorStep: 3 };
    return { valid: true, firstErrorStep: null };
  };

  // ═══════ Handlers ═══════
  const handleNext = async () => {
    const stepFields = getStepFields(currentStep);
    if (stepFields.length > 0) {
      const isValid = await form.trigger(stepFields as any);
      if (!isValid) return;
    }

    if (currentStep === 2) {
      const criteria = form.getValues('weighted_criteria');
      const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
      if (totalWeight !== 100) {
        toast.error(`Evaluation weights must sum to 100% (currently ${totalWeight}%)`);
        return;
      }
    }

    if (isEditMode && challengeId) {
      const values = form.getValues();
      const fields = buildFieldsFromForm(values);
      saveStepMutation.mutate({ challengeId, fields });
    }

    if (currentStep < TOTAL_STEPS) {
      setCompletedSteps((prev) => prev.includes(currentStep) ? prev : [...prev, currentStep]);
      setCurrentStep((s) => s + 1);
    } else {
      const result = await validateAllSteps();
      if (!result.valid && result.firstErrorStep) {
        setCurrentStep(result.firstErrorStep);
        toast.error(`Please fix errors in Step ${result.firstErrorStep}`);
        return;
      }
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSaveDraft = async () => {
    const values = form.getValues();
    if (isEditMode && challengeId) {
      const fields = buildFieldsFromForm(values);
      saveStepMutation.mutate({ challengeId, fields }, { onSuccess: () => toast.success('Draft saved') });
    } else {
      if (!currentOrg || !user?.id) return;
      createChallengeMutation.mutate(
        {
          orgId: currentOrg.organizationId,
          creatorId: user.id,
          operatingModel: 'MP',
          businessProblem: values.problem_statement || values.title,
          expectedOutcomes: values.scope || '',
          currency: values.currency_code,
          budgetMin: values.platinum_award,
          budgetMax: values.platinum_award,
          expectedTimeline: values.expected_timeline || '',
          domainTags: values.domain_tags ?? [],
          urgency: 'normal',
        },
        {
          onSuccess: ({ challengeId: newId }) => {
            const fields = buildFieldsFromForm(values);
            saveStepMutation.mutate({ challengeId: newId, fields }, {
              onSuccess: () => {
                toast.success('Draft saved');
                navigate(`/cogni/challenges/${newId}/edit`);
              },
            });
          },
        }
      );
    }
  };

  const handleConfirmSubmit = async () => {
    if (!user?.id) return;
    const values = form.getValues();
    const fields = buildFieldsFromForm(values);

    if (isEditMode && challengeId) {
      try {
        await saveStepMutation.mutateAsync({ challengeId, fields });
        if (isEnterprise) {
          await supabase.from('challenges').update({ phase_status: 'LEGAL_VERIFICATION_PENDING' }).eq('id', challengeId);
          toast.success('Challenge content complete. Legal documents must be attached before curation submission.');
          navigate(`/cogni/challenges/${challengeId}/legal`);
        } else {
          await submitMutation.mutateAsync({ challengeId, userId: user.id });
          toast.success('Challenge created successfully!');
          navigate('/cogni/dashboard');
        }
      } catch { /* Error handled by mutation onError */ }
    } else {
      if (!currentOrg) return;
      try {
        const { challengeId: newId } = await createChallengeMutation.mutateAsync({
          orgId: currentOrg.organizationId,
          creatorId: user.id,
          operatingModel: isAggBypass ? 'AGG' : 'MP',
          businessProblem: values.problem_statement || values.title,
          expectedOutcomes: values.scope || '',
          currency: values.currency_code,
          budgetMin: values.platinum_award,
          budgetMax: values.platinum_award,
          expectedTimeline: values.expected_timeline || '',
          domainTags: values.domain_tags ?? [],
          urgency: 'normal',
        });

        if (isAggBypass) {
          await supabase.from('audit_trail').insert({
            user_id: user.id, challenge_id: newId, action: 'PHASE_COMPLETED', method: 'SYSTEM',
            phase_from: 1, phase_to: 2,
            details: { status: 'COMPLETED_BYPASSED', reason: 'AGG_PHASE1_BYPASS' },
            created_by: user.id,
          });
        }

        await saveStepMutation.mutateAsync({ challengeId: newId, fields });
        if (isEnterprise) {
          await supabase.from('challenges').update({ phase_status: 'LEGAL_VERIFICATION_PENDING' }).eq('id', newId);
          toast.success('Challenge content complete. Legal documents must be attached before curation submission.');
          navigate(`/cogni/challenges/${newId}/legal`);
        } else {
          await submitMutation.mutateAsync({ challengeId: newId, userId: user.id });
          toast.success('Challenge created successfully!');
          navigate('/cogni/dashboard');
        }
      } catch { /* Error handled by mutation onError */ }
    }
    setShowSummary(false);
  };

  // ═══════ Render ═══════
  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* ── Page Header ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {pageTitle}
              <Badge variant="outline" className="text-xs font-normal">Draft</Badge>
            </h1>
            <Badge variant="secondary" className="text-[10px] font-normal">Advanced Editor</Badge>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">
              {modeConfig.label} governance
            </p>
            <span className="text-muted-foreground">·</span>
            {!embedded && (
              <button
                type="button"
                onClick={() => onSwitchToSimple ? onSwitchToSimple() : navigate('/cogni/challenges/create')}
                className="text-xs text-primary hover:underline"
              >
                ← Back to Simple View
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Draft SLA */}
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Draft SLA:</span>
            <Badge variant={daysRemaining <= 3 ? 'destructive' : 'secondary'} className="text-xs">
              {daysRemaining} days remaining
            </Badge>
          </div>
          {/* Auto-saved indicator */}
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            <Save className="h-3 w-3 mr-1" />
            Auto-saved
          </Badge>
        </div>
      </div>

      {/* ── Top Action Buttons ────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSaveDraft} disabled={saveStepMutation.isPending}>
          <Save className="h-3.5 w-3.5" /> Save Draft
        </Button>
        {isEditMode && (
          <>
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50">
              <PauseCircle className="h-3.5 w-3.5" /> Put on Hold
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
              <XCircle className="h-3.5 w-3.5" /> Cancel Challenge
            </Button>
          </>
        )}
      </div>

      {/* ── Business Rules Banner ─────────────────────── */}
      <div className="rounded-lg border border-border bg-muted/30 mb-4">
        <button
          type="button"
          onClick={() => setShowBusinessRules(!showBusinessRules)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Business Rules</span>
            <Badge variant="secondary" className="text-[10px]">9 rules</Badge>
          </div>
          {showBusinessRules ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showBusinessRules && (
          <div className="px-4 pb-3 space-y-1">
            {BUSINESS_RULES.map((rule) => (
              <p key={rule} className="text-xs text-muted-foreground">{rule}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── Source Request Banner ──────────────────────── */}
      {sourceRequest && (
        <div className="rounded-lg border border-[hsl(210,68%,70%)] bg-[hsl(210,68%,96%)] p-3 mb-4 flex items-start gap-3">
          <FileText className="h-5 w-5 text-[hsl(210,68%,54%)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[hsl(210,68%,30%)]">
              Creating challenge from Solution Request {sourceRequest.source_sr_title ?? ''}
            </p>
            <p className="text-xs text-[hsl(210,40%,45%)] mt-0.5">
              by {sourceRequest.source_sr_creator_name ?? 'Unknown'} ({sourceRequest.source_sr_org_name ?? ''})
            </p>
          </div>
          <Button variant="link" size="sm" className="text-xs shrink-0" onClick={() => navigate('/cogni/my-requests')}>
            View Original Request
          </Button>
        </div>
      )}

      {/* ── AGG Phase 1 Bypass Banner ─────────────────── */}
      {isAggBypass && !isEditMode && (
        <div className="rounded-lg border border-[hsl(210,68%,70%)] bg-[hsl(210,68%,96%)] p-3 mb-4 flex items-start gap-3">
          <span className="shrink-0 mt-0.5 rounded-full bg-[hsl(210,68%,54%)] p-1">
            <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-[hsl(210,68%,30%)]">Phase 1 Bypass Active</p>
            <p className="text-xs text-[hsl(210,40%,45%)] mt-0.5">
              Your organization has Aggregator model with direct creation enabled. Phase 1 (Solution Request) is automatically skipped.
            </p>
          </div>
        </div>
      )}

      {/* ── Progress Bar ──────────────────────────────── */}
      <ChallengeProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
        stepFieldCounts={formCompletion.steps}
      />

      {/* ── Overall Completion ────────────────────────── */}
      <FormCompletionBar
        filledCount={formCompletion.totalFilled}
        totalCount={formCompletion.totalRequired}
      />

      {/* ── Form Card ─────────────────────────────────── */}
      <div className="bg-white rounded-xl p-6" style={{ border: '1px solid #E5E7EB' }}>
        <form onSubmit={(e) => e.preventDefault()}>
          {currentStep === 0 && (
            <StepModeSelection form={form} orgOperatingModel={orgContext?.operatingModel} tierName={(tierLimit as any)?.tier_name} />
          )}
          {currentStep === 1 && (
            <StepProblem form={form} mandatoryFields={mandatoryFields} isLightweight={isLightweight} fieldRules={fieldRules} />
          )}
          {currentStep === 2 && (
            <StepEvaluation form={form} mandatoryFields={mandatoryFields} isLightweight={isLightweight} fieldRules={fieldRules} />
          )}
          {currentStep === 3 && (
            <StepRewards form={form} mandatoryFields={mandatoryFields} isLightweight={isLightweight} fieldRules={fieldRules} />
          )}
          {currentStep === 4 && (
            <StepTimeline form={form} mandatoryFields={mandatoryFields} isLightweight={isLightweight} fieldRules={fieldRules} />
          )}
          {currentStep === 5 && (
            <StepProviderEligibility form={form} mandatoryFields={mandatoryFields} isLightweight={isLightweight} fieldRules={fieldRules} />
          )}
          {currentStep === 6 && (
            <StepTemplates form={form} mandatoryFields={mandatoryFields} isLightweight={isLightweight} fieldRules={fieldRules} />
          )}
          {currentStep === 7 && (
            <StepReviewSubmit form={form} mandatoryFields={mandatoryFields} isLightweight={isLightweight} fieldRules={fieldRules} onNavigateToStep={(step) => setCurrentStep(step)} />
          )}

          {/* Bottom Bar */}
          <ChallengeWizardBottomBar
            currentStep={currentStep}
            totalSteps={TOTAL_STEPS}
            governanceProfile={governanceProfile}
            onBack={handleBack}
            onNext={handleNext}
            onSaveDraft={handleSaveDraft}
            isSaving={saveStepMutation.isPending || createChallengeMutation.isPending}
            isSubmitting={submitMutation.isPending}
          />
        </form>
      </div>

      {/* ── Submission Summary Modal ──────────────────── */}
      <ChallengeSubmitSummaryModal
        open={showSummary}
        onOpenChange={setShowSummary}
        values={form.getValues()}
        governanceProfile={governanceProfile}
        isSubmitting={saveStepMutation.isPending || submitMutation.isPending || createChallengeMutation.isPending}
        onConfirm={handleConfirmSubmit}
      />
    </div>
  );
}

/* ─── Helper: step → field names for validation ────────── */

function getStepFields(step: number): string[] {
  switch (step) {
    case 0:
      return ['governance_mode'];
    case 1:
      return ['title', 'problem_statement', 'domain_tags', 'maturity_level', 'deliverables_list'];
    case 2:
      return ['weighted_criteria'];
    case 3:
      return ['currency_code', 'platinum_award', 'gold_award', 'num_rewarded_solutions', 'payment_milestones', 'ip_model', 'effort_level'];
    case 4:
      return ['submission_deadline', 'phase_durations'];
    case 5:
      return ['eligible_participation_modes', 'solver_eligibility_ids', 'permitted_artifact_types', 'targeting_filters', 'challenge_visibility', 'challenge_enrollment', 'challenge_submission', 'eligibility'];
    case 6:
      return [];
    case 7:
      return [];
    default:
      return [];
  }
}
