/**
 * ChallengeWizardPage — 4-step Challenge Creation / Edit wizard.
 * Route: /cogni/challenges/new  |  /cogni/challenges/:id/edit
 *
 * Governance-aware:
 *   LIGHTWEIGHT → 8 mandatory fields, advanced sections collapsed
 *   ENTERPRISE  → 16 mandatory fields, all fields visible
 *
 * Final submit label varies by governance_profile.
 */

import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import {
  challengeFormSchema,
  DEFAULT_FORM_VALUES,
  type ChallengeFormValues,
} from '@/components/cogniblend/challenge-wizard/challengeFormSchema';

const TOTAL_STEPS = 4;

export default function ChallengeWizardPage() {
  // ═══════ Hooks — state ═══════
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

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
    : currentOrg ? 'LIGHTWEIGHT' : null; // default for new challenges

  const { data: mandatoryFields = [], isLoading: fieldsLoading } = useMandatoryFields(governanceProfile);

  // ═══════ Hooks — mutations ═══════
  const saveDraftMutation = useSubmitSolutionRequest();
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
  const pageTitle = isEditMode ? 'Edit Challenge' : 'Create Challenge';

  // ═══════ Handlers ═══════
  const buildFieldsFromForm = (values: ChallengeFormValues) => {
    const deliverables = values.deliverables_list.filter(Boolean);
    const criteria = values.weighted_criteria.filter((c) => c.name);

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
      },
    };
  };

  const handleNext = async () => {
    // Validate current step fields
    const stepFields = getStepFields(currentStep);
    const isValid = await form.trigger(stepFields as any);
    if (!isValid) return;

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
      // Final submit
      handleSubmit();
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
      // Create new draft via initialize_challenge (no phase advance)
      if (!currentOrg || !user?.id) return;
      saveDraftMutation.mutate({
        orgId: currentOrg.organizationId,
        creatorId: user.id,
        operatingModel: 'MP',
        businessProblem: values.problem_statement || values.title,
        expectedOutcomes: values.scope || '',
        currency: values.currency_code,
        budgetMin: values.platinum_award,
        budgetMax: values.platinum_award,
        expectedTimeline: values.expected_timeline || '',
        domainTags: [],
        urgency: 'normal',
      });
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    if (isEditMode && challengeId) {
      // Save final fields then complete phase
      const values = form.getValues();
      const fields = buildFieldsFromForm(values);

      try {
        await saveStepMutation.mutateAsync({ challengeId, fields });
        await submitMutation.mutateAsync({
          challengeId,
          userId: user.id,
        });
        navigate('/cogni/dashboard');
      } catch {
        // Error handled by mutation onError
      }
    } else {
      // New challenge — use the full solution request flow
      if (!currentOrg) return;
      const values = form.getValues();

      saveDraftMutation.mutate(
        {
          orgId: currentOrg.organizationId,
          creatorId: user.id,
          operatingModel: 'MP',
          businessProblem: values.problem_statement || values.title,
          expectedOutcomes: values.scope || '',
          currency: values.currency_code,
          budgetMin: values.budget_min,
          budgetMax: values.budget_max,
          expectedTimeline: values.expected_timeline || '',
          domainTags: [],
          urgency: 'normal',
        },
        {
          onSuccess: () => navigate('/cogni/dashboard'),
        }
      );
    }
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
            isSaving={saveStepMutation.isPending || saveDraftMutation.isPending}
            isSubmitting={submitMutation.isPending}
          />
        </form>
      </div>
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
      return ['criteria_list', 'currency_code', 'budget_min', 'budget_max', 'max_solutions'];
    case 4:
      return ['submission_deadline', 'expected_timeline', 'review_duration', 'phase_notes'];
    default:
      return [];
  }
}
