/**
 * ChallengeWizardPage — 4-step Challenge Creation / Edit wizard.
 * Route: /cogni/challenges/new  |  /cogni/challenges/:id/edit
 *
 * Governance-aware:
 *   LIGHTWEIGHT → 8 mandatory fields, advanced sections collapsed
 *   ENTERPRISE  → 16 mandatory fields, all fields visible
 *
 * Submission flow:
 *   - Save Draft: persists all fields, keeps phase_status ACTIVE
 *   - Submit: validates all steps, shows summary modal, then:
 *     Enterprise → saves + navigates to /challenges/:id/legal
 *     Lightweight → saves + complete_phase → /cogni/dashboard
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import {
  useChallengeDetail,
  useMandatoryFields,
  useSaveChallengeStep,
  useSubmitChallengeForReview,
} from '@/hooks/queries/useChallengeForm';
import { useSubmitSolutionRequest } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { ChallengeProgressBar } from '@/components/cogniblend/challenge-wizard/ChallengeProgressBar';
import { ChallengeWizardBottomBar } from '@/components/cogniblend/challenge-wizard/ChallengeWizardBottomBar';
import { StepProblem } from '@/components/cogniblend/challenge-wizard/StepProblem';
import { StepRequirements } from '@/components/cogniblend/challenge-wizard/StepRequirements';
import { StepEvaluation } from '@/components/cogniblend/challenge-wizard/StepEvaluation';
import { StepTimeline } from '@/components/cogniblend/challenge-wizard/StepTimeline';
import { ChallengeSubmitSummaryModal } from '@/components/cogniblend/challenge-wizard/ChallengeSubmitSummaryModal';
import {
  createChallengeFormSchema,
  challengeFormSchema,
  DEFAULT_FORM_VALUES,
  type ChallengeFormValues,
} from '@/components/cogniblend/challenge-wizard/challengeFormSchema';

const TOTAL_STEPS = 4;

export default function ChallengeWizardPage() {
  // ═══════ Hooks — state ═══════
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // ═══════ Hooks — context ═══════
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: challengeId } = useParams<{ id: string }>();
  const isEditMode = !!challengeId;

  // ═══════ Hooks — form ═══════
  const form = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  // ═══════ Hooks — queries ═══════
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: challengeData, isLoading: challengeLoading } = useChallengeDetail(challengeId);

  const governanceProfile = isEditMode
    ? challengeData?.governance_profile ?? null
    : currentOrg ? 'LIGHTWEIGHT' : null;

  const { data: mandatoryFields = [], isLoading: fieldsLoading } = useMandatoryFields(governanceProfile);

  // ═══════ Hooks — mutations ═══════
  const createChallengeMutation = useSubmitSolutionRequest();
  const saveStepMutation = useSaveChallengeStep();
  const submitMutation = useSubmitChallengeForReview();

  // ═══════ Hooks — effects ═══════
  useEffect(() => {
    if (challengeData && isEditMode) {
      form.reset({
        title: challengeData.title ?? '',
        description: challengeData.description ?? '',
        problem_statement: challengeData.problem_statement ?? '',
        scope: challengeData.scope ?? '',
        domain_tags: [],
        deliverables_list: Array.isArray(challengeData.deliverables)
          ? (challengeData.deliverables as any).items ?? ['']
          : [''],
        maturity_level: (challengeData.maturity_level as ChallengeFormValues['maturity_level']) ?? undefined as unknown as 'blueprint',
        ip_model: challengeData.ip_model ?? '',
        visibility: challengeData.visibility ?? 'public',
        eligibility: challengeData.eligibility ?? '',
        complexity_notes: '',
        weighted_criteria: Array.isArray((challengeData.evaluation_criteria as any)?.criteria)
          ? (challengeData.evaluation_criteria as any).criteria.map((c: any) => ({
              name: c.name ?? c ?? '',
              weight: c.weight ?? 0,
            }))
          : [
              { name: 'Technical Feasibility', weight: 30 },
              { name: 'Innovation & Novelty', weight: 30 },
              { name: 'Implementation Plan', weight: 40 },
            ],
        currency_code: challengeData.currency_code ?? 'USD',
        platinum_award: (challengeData.reward_structure as any)?.platinum ?? 0,
        gold_award: (challengeData.reward_structure as any)?.gold ?? 0,
        silver_award: (challengeData.reward_structure as any)?.silver ?? undefined,
        rejection_fee_pct: (challengeData as any)?.rejection_fee_percentage ?? 10,
        submission_guidelines: '',
        taxonomy_tags: '',
        submission_deadline: challengeData.submission_deadline
          ? challengeData.submission_deadline.substring(0, 16)
          : '',
        expected_timeline: (challengeData.phase_schedule as any)?.expected_timeline ?? '',
        review_duration: undefined,
        phase_notes: '',
        permitted_artifact_types: [],
        phase_durations: (challengeData.phase_schedule as any)?.phase_durations ?? undefined,
        complexity_params: (challengeData.complexity_parameters as any) ?? undefined,
      });
    }
  }, [challengeData, isEditMode, form]);

  // ═══════ Conditional returns ═══════
  if (orgLoading || (isEditMode && challengeLoading) || fieldsLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  // ═══════ Derived ═══════
  const isLightweight = governanceProfile === 'LIGHTWEIGHT';
  const isEnterprise = governanceProfile === 'ENTERPRISE';
  const pageTitle = isEditMode ? 'Edit Challenge' : 'Create Challenge';

  // ═══════ Helpers ═══════
  const buildFieldsFromForm = (values: ChallengeFormValues) => {
    const deliverables = values.deliverables_list.filter(Boolean);
    const criteria = values.weighted_criteria.filter((c) => c.name);

    // Calculate complexity score from params
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
      // Lightweight dropdown
      const map: Record<string, string> = { low: 'L1', medium: 'L3', high: 'L5' };
      complexityLevel = map[values.complexity_notes] ?? null;
    }

    return {
      title: values.title,
      description: values.description || null,
      problem_statement: values.problem_statement || null,
      scope: values.scope || null,
      deliverables: deliverables.length ? { items: deliverables } : null,
      evaluation_criteria: criteria.length ? { criteria } : null,
      reward_structure: {
        currency: values.currency_code,
        platinum: values.platinum_award,
        gold: values.gold_award,
        silver: values.silver_award ?? null,
      },
      maturity_level: values.maturity_level || null,
      ip_model: values.ip_model || null,
      visibility: values.visibility || 'public',
      eligibility: values.eligibility || null,
      rejection_fee_percentage: values.rejection_fee_pct,
      submission_deadline: values.submission_deadline || null,
      phase_schedule: {
        expected_timeline: values.expected_timeline || null,
        review_duration: values.review_duration || null,
        notes: values.phase_notes || null,
        phase_durations: values.phase_durations || null,
      },
      complexity_parameters: values.complexity_params || null,
      complexity_score: complexityScore,
      complexity_level: complexityLevel,
    };
  };

  // ═══════ Cross-step validation ═══════
  const validateAllSteps = async (): Promise<{ valid: boolean; firstErrorStep: number | null }> => {
    // Validate all step fields together
    const allFields = [
      ...getStepFields(1),
      ...getStepFields(2),
      ...getStepFields(3),
      ...getStepFields(4),
    ];

    const isValid = await form.trigger(allFields as any);

    if (!isValid) {
      // Find first step with errors
      for (let step = 1; step <= TOTAL_STEPS; step++) {
        const stepFields = getStepFields(step);
        const stepValid = await form.trigger(stepFields as any);
        if (!stepValid) {
          return { valid: false, firstErrorStep: step };
        }
      }
    }

    // Check evaluation weights sum to 100%
    const criteria = form.getValues('weighted_criteria');
    const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight !== 100) {
      return { valid: false, firstErrorStep: 3 };
    }

    // Check reward order: Platinum > Gold > Silver
    const platinum = form.getValues('platinum_award');
    const gold = form.getValues('gold_award');
    const silver = form.getValues('silver_award');
    if (platinum <= 0 || gold <= 0 || platinum <= gold) {
      return { valid: false, firstErrorStep: 3 };
    }
    if (silver !== undefined && silver > 0 && gold <= silver) {
      return { valid: false, firstErrorStep: 3 };
    }

    return { valid: true, firstErrorStep: null };
  };

  // ═══════ Handlers ═══════
  const handleNext = async () => {
    const stepFields = getStepFields(currentStep);
    const isValid = await form.trigger(stepFields as any);
    if (!isValid) return;

    // Extra check: Step 3 weights must equal 100%
    if (currentStep === 3) {
      const criteria = form.getValues('weighted_criteria');
      const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
      if (totalWeight !== 100) {
        toast.error(`Evaluation weights must sum to 100% (currently ${totalWeight}%)`);
        return;
      }
    }

    // Auto-save step if editing existing challenge
    if (isEditMode && challengeId) {
      const values = form.getValues();
      const fields = buildFieldsFromForm(values);
      saveStepMutation.mutate({ challengeId, fields });
    }

    if (currentStep < TOTAL_STEPS) {
      setCompletedSteps((prev) =>
        prev.includes(currentStep) ? prev : [...prev, currentStep]
      );
      setCurrentStep((s) => s + 1);
    } else {
      // Step 4 "Submit" → full validation then show summary modal
      const result = await validateAllSteps();
      if (!result.valid && result.firstErrorStep) {
        setCurrentStep(result.firstErrorStep);
        if (result.firstErrorStep === 3) {
          toast.error('Please fix evaluation criteria: weights must sum to 100%');
        } else {
          toast.error(`Please fix errors in Step ${result.firstErrorStep}`);
        }
        return;
      }
      setShowSummary(true);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleSaveDraft = async () => {
    const values = form.getValues();

    if (isEditMode && challengeId) {
      const fields = buildFieldsFromForm(values);
      saveStepMutation.mutate(
        { challengeId, fields },
        {
          onSuccess: () => toast.success('Draft saved'),
        }
      );
    } else {
      // Create new draft via initialize_challenge
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
            // Now save all wizard fields to the newly created challenge
            const fields = buildFieldsFromForm(values);
            saveStepMutation.mutate(
              { challengeId: newId, fields },
              {
                onSuccess: () => {
                  toast.success('Draft saved');
                  navigate(`/cogni/challenges/${newId}/edit`);
                },
              }
            );
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
        // 1. Save all fields
        await saveStepMutation.mutateAsync({ challengeId, fields });

        if (isEnterprise) {
          // Enterprise: navigate to legal review page
          toast.success('Challenge saved. Proceeding to Legal Review.');
          navigate(`/cogni/challenges/${challengeId}/legal`);
        } else {
          // Lightweight: complete_phase (Phase 2 → 3, auto-completes through)
          await submitMutation.mutateAsync({
            challengeId,
            userId: user.id,
          });
          toast.success('Challenge created successfully!');
          navigate('/cogni/dashboard');
        }
      } catch {
        // Error handled by mutation onError
      }
    } else {
      // New challenge: create then submit
      if (!currentOrg) return;

      try {
        const { challengeId: newId } = await createChallengeMutation.mutateAsync({
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
        });

        // Save full wizard fields
        await saveStepMutation.mutateAsync({ challengeId: newId, fields });

        if (isEnterprise) {
          toast.success('Challenge saved. Proceeding to Legal Review.');
          navigate(`/cogni/challenges/${newId}/legal`);
        } else {
          await submitMutation.mutateAsync({
            challengeId: newId,
            userId: user.id,
          });
          toast.success('Challenge created successfully!');
          navigate('/cogni/dashboard');
        }
      } catch {
        // Error handled by mutation onError
      }
    }

    setShowSummary(false);
  };

  // ═══════ Render ═══════
  return (
    <div className="max-w-3xl mx-auto pb-8">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">{pageTitle}</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {isLightweight
          ? 'Lightweight governance — fewer required fields'
          : 'Enterprise governance — all fields required'}
      </p>

      {/* Progress Bar */}
      <ChallengeProgressBar
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      {/* Form Card */}
      <div
        className="bg-white rounded-xl p-6"
        style={{ border: '1px solid #E5E7EB' }}
      >
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Step Content */}
          {currentStep === 1 && (
            <StepProblem
              form={form}
              mandatoryFields={mandatoryFields}
              isLightweight={isLightweight}
            />
          )}
          {currentStep === 2 && (
            <StepRequirements
              form={form}
              mandatoryFields={mandatoryFields}
              isLightweight={isLightweight}
            />
          )}
          {currentStep === 3 && (
            <StepEvaluation
              form={form}
              mandatoryFields={mandatoryFields}
              isLightweight={isLightweight}
            />
          )}
          {currentStep === 4 && (
            <StepTimeline
              form={form}
              mandatoryFields={mandatoryFields}
              isLightweight={isLightweight}
            />
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

      {/* Submission Summary Modal */}
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
    case 1:
      return ['title', 'problem_statement', 'domain_tags', 'maturity_level'];
    case 2:
      return ['deliverables_list', 'permitted_artifact_types', 'submission_guidelines', 'ip_model'];
    case 3:
      return ['weighted_criteria', 'currency_code', 'platinum_award', 'gold_award'];
    case 4:
      return ['submission_deadline', 'phase_durations'];
    default:
      return [];
  }
}
