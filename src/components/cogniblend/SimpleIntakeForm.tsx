/**
 * SimpleIntakeForm — Model-adaptive intake form for AM/RQ roles.
 * AGG (RQ): Template selector cards + single Problem/Idea editor — auto-derives title.
 * MP (AM): 6-field "Submit a Problem Brief" — Title, Problem Summary, Solution Expectations, Sector, Budget, Timeline.
 * 
 * Supports mode="create" (default), mode="edit" (pre-fills from existing challenge),
 * and mode="view" (read-only display with content-hugging heights).
 * On submit: creates challenge at Phase 1 (create) or updates existing challenge (edit).
 */

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Save, Loader2, Maximize2, ShieldCheck, ArrowLeft, Bot } from 'lucide-react';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';
import { useFormPersistence, persistState, restoreState, clearState } from '@/hooks/useFormPersistence';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TemplateSelector } from '@/components/cogniblend/TemplateSelector';
import { CHALLENGE_TEMPLATES, type ChallengeTemplate } from '@/lib/challengeTemplates';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext, useChallengeArchitects } from '@/hooks/queries/useSolutionRequestContext';
import { useSubmitSolutionRequest, useSaveDraft } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import { AIReviewInline, type SectionReview } from '@/components/cogniblend/shared/AIReviewInline';

/* ── Constants ── */

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
] as const;

const TIMELINE_OPTIONS = [
  { value: '1-3', label: 'Urgent (1–3 months)' },
  { value: '3-6', label: 'Standard (3–6 months)' },
  { value: '6-12', label: 'Flexible (6–12 months)' },
  { value: '12+', label: 'Extended (12+ months)' },
] as const;

/* ── Schemas ── */

/** AGG (RQ) schema — template card + single idea field */
const aggSchema = z.object({
  selected_template: z.string().min(1, 'Please select a challenge type'),
  problem_summary: z.string().trim().min(10, 'Please describe your idea (at least 10 characters)').max(5000, 'Keep your idea under 5000 characters'),
  beneficiaries_mapping: z.string().optional().default(''),
  expected_timeline: z.enum(['1-3', '3-6', '6-12', '12+'], {
    errorMap: () => ({ message: 'Please select a timeline' }),
  }),
  industry_segment_id: z.string().min(1, 'Please select an industry segment'),
  title: z.string().optional(),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
  budget_min: z.coerce.number().optional(),
  budget_max: z.coerce.number().optional(),
  solution_expectations: z.string().optional(),
  architect_id: z.string().optional(),
});

/** MP (AM) schema — comprehensive 6-field problem brief */
const mpSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  problem_summary: z.string().trim().min(1, 'Problem summary is required').max(5000, 'Problem summary must be 5000 characters or less'),
  industry_segment_id: z.string().min(1, 'Please select a sector'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
  budget_min: z.coerce.number().min(0, 'Minimum budget must be 0 or more'),
  budget_max: z.coerce.number().min(1, 'Maximum budget is required'),
  expected_timeline: z.enum(['1-3', '3-6', '6-12', '12+'], {
    errorMap: () => ({ message: 'Please select a timeline' }),
  }),
  solution_expectations: z.string().trim().max(5000, 'Keep under 5000 characters').optional().or(z.literal('')),
  am_approval_required: z.boolean().default(true),
  architect_id: z.string().optional(),
  selected_template: z.string().optional(),
  beneficiaries_mapping: z.string().optional().default(''),
}).refine(data => data.budget_min! < data.budget_max!, {
  message: 'Minimum must be less than maximum.',
  path: ['budget_min'],
});

type SimpleIntakeValues = z.infer<typeof mpSchema>;

/* ── Props ── */

interface SimpleIntakeFormProps {
  /** Challenge ID for edit/view mode */
  challengeId?: string;
  /** 'create' (default), 'edit', or 'view' (read-only) */
  mode?: 'create' | 'edit' | 'view';
}

/* ── Hook: fetch existing challenge for edit mode ── */

function useExistingChallenge(challengeId?: string) {
  return useQuery({
    queryKey: ['challenge-intake-edit', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, problem_statement, scope, operating_model, reward_structure, phase_schedule, eligibility, extended_brief, ai_section_reviews')
        .eq('id', challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });
}

/* ── Hook: update existing challenge ── */

function useUpdateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ challengeId, payload }: { challengeId: string; payload: Record<string, unknown> }) => {
      const withAudit = await withUpdatedBy(payload);
      const { error } = await supabase
        .from('challenges')
        .update(withAudit as any)
        .eq('id', challengeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, variables) => {
      toast.success('Challenge updated successfully');
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-intake-edit', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-detail', variables.challengeId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_challenge_intake' });
    },
  });
}

/* ── Component ── */

export function SimpleIntakeForm({ challengeId, mode = 'create' }: SimpleIntakeFormProps) {
  const isEditMode = (mode === 'edit' || mode === 'view') && !!challengeId;
  const isViewMode = mode === 'view';

  // ═══════ Hooks — state ═══════
  const [showTierLimit, setShowTierLimit] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(
    () => isEditMode ? null : restoreState<ChallengeTemplate>('cogni_intake_simple_template'),
  );
  const [problemFullscreen, setProblemFullscreen] = useState(false);
  const [beneficiariesFullscreen, setBeneficiariesFullscreen] = useState(false);
  const [mpProblemFullscreen, setMpProblemFullscreen] = useState(false);
  const [commercialFullscreen, setCommercialFullscreen] = useState(false);
  const [formInitialized, setFormInitialized] = useState(!isEditMode);
  const [aiReviews, setAiReviews] = useState<Record<string, SectionReview>>({});
  const [isAiReviewing, setIsAiReviewing] = useState(false);

  // ═══════ Hooks — context ═══════
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext, isLoading: modelLoading } = useOrgModelContext();
  const { data: tierLimit, isLoading: tierLoading } = useTierLimitCheck();
  const { data: industrySegments = [], isLoading: segmentsLoading } = useIndustrySegmentOptions();
  const { data: architects = [] } = useChallengeArchitects();

  // ═══════ Hooks — edit mode data ═══════
  const { data: existingChallenge, isLoading: editLoading } = useExistingChallenge(isEditMode ? challengeId : undefined);

  // ═══════ Hooks — mutations ═══════
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();
  const updateMutation = useUpdateChallenge();

  // ═══════ Hooks — form ═══════
  const isMP = isEditMode
    ? (existingChallenge?.operating_model === 'MP')
    : (orgContext?.operatingModel === 'MP');

  const form = useForm<SimpleIntakeValues>({
    resolver: zodResolver(isMP ? mpSchema : aggSchema),
    defaultValues: {
      title: '',
      problem_summary: '',
      industry_segment_id: '',
      currency: 'USD',
      budget_min: 0,
      budget_max: 0,
      expected_timeline: undefined,
      solution_expectations: '',
      architect_id: '',
      am_approval_required: true,
      selected_template: '',
      beneficiaries_mapping: '',
    },
    mode: 'onBlur',
  });

  const persistenceKey = isEditMode ? `cogni_intake_edit_${challengeId}` : 'cogni_intake_simple';
  const { clearPersistedData } = useFormPersistence(persistenceKey, form);
  const { register, control, handleSubmit, setValue, watch, getValues, formState: { errors }, reset } = form;
  const problemSummary = watch('problem_summary');
  const solutionExpectations = watch('solution_expectations');

  // ═══════ Effect — pre-fill form from existing challenge ═══════
  useEffect(() => {
    if (!isEditMode || !existingChallenge || formInitialized) return;

    const c = existingChallenge;
    const reward = typeof c.reward_structure === 'object' ? (c.reward_structure as Record<string, any>) : {};
    const schedule = typeof c.phase_schedule === 'object' ? (c.phase_schedule as Record<string, any>) : {};
    const elig = typeof c.eligibility === 'string' ? (() => { try { return JSON.parse(c.eligibility); } catch { return {}; } })() : (c.eligibility ?? {});
    const extBrief = typeof c.extended_brief === 'object' ? (c.extended_brief as Record<string, any>) : {};

    const timeline = schedule?.expected_timeline;
    const validTimelines = ['1-3', '3-6', '6-12', '12+'];

    // Restore template from extended_brief OR selected_template form field
    const storedTemplateId = extBrief?.challenge_template_id || (c as any).selected_template || '';
    if (storedTemplateId) {
      const found = CHALLENGE_TEMPLATES.find(t => t.id === storedTemplateId);
      if (found) setSelectedTemplate(found);
    }

    reset({
      title: c.title || '',
      problem_summary: c.problem_statement || '',
      industry_segment_id: elig?.industry_segment_id || '',
      currency: (reward?.currency as any) || 'USD',
      budget_min: reward?.budget_min ?? 0,
      budget_max: reward?.budget_max ?? 0,
      expected_timeline: validTimelines.includes(timeline) ? timeline : undefined,
      solution_expectations: c.scope || '',
      am_approval_required: extBrief?.am_approval_required ?? true,
      architect_id: '',
      selected_template: extBrief?.challenge_template_id || '',
      beneficiaries_mapping: extBrief?.beneficiaries_mapping || '',
    });

    setFormInitialized(true);
  }, [isEditMode, existingChallenge, formInitialized, reset]);

  // ═══════ Effect — load persisted AI reviews ═══════
  useEffect(() => {
    if (!existingChallenge?.ai_section_reviews) return;
    const reviews = Array.isArray(existingChallenge.ai_section_reviews)
      ? existingChallenge.ai_section_reviews as unknown as SectionReview[]
      : [];
    const map: Record<string, SectionReview> = {};
    for (const r of reviews) { if (r.section_key) map[r.section_key] = r; }
    setAiReviews(map);
  }, [existingChallenge?.ai_section_reviews]);

  // ═══════ Derived ═══════
  const isSubmitting = submitMutation.isPending || updateMutation.isPending;
  const isSaving = draftMutation.isPending;
  const isBusy = isSubmitting || isSaving;

  // ═══════ AI Review handlers ═══════
  const handleRunAiReview = async () => {
    if (!challengeId) return;
    setIsAiReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('review-challenge-sections', {
        body: { challenge_id: challengeId, role_context: 'intake' },
      });
      if (error) throw new Error(error.message);
      if (data?.success && data.data?.sections) {
        const map: Record<string, SectionReview> = { ...aiReviews };
        for (const r of data.data.sections as SectionReview[]) { map[r.section_key] = r; }
        setAiReviews(map);
        // Persist review results to DB
        const reviewsArray = Object.values(map);
        updateMutation.mutate({ challengeId, payload: { ai_section_reviews: reviewsArray } });
        toast.success('AI review complete — see comments below each section.');
      } else {
        throw new Error(data?.error?.message ?? 'Unexpected response');
      }
    } catch (e: any) {
      toast.error(`AI review failed: ${e.message ?? 'Unknown error'}`);
    } finally {
      setIsAiReviewing(false);
    }
  };

  const handleAcceptRefinement = async (sectionKey: string, newContent: string) => {
    if (!challengeId) return;
    const fieldMap: Record<string, string> = {
      problem_statement: 'problem_summary',
      scope: 'solution_expectations',
      beneficiaries_mapping: 'beneficiaries_mapping',
    };
    const formField = fieldMap[sectionKey];
    if (formField) {
      setValue(formField as any, newContent, { shouldValidate: true });
    }
    // Update local state
    const updated = { ...aiReviews };
    if (updated[sectionKey]) { updated[sectionKey] = { ...updated[sectionKey], addressed: true }; }
    setAiReviews(updated);

    // Persist refined content + review state to DB
    const reviewsArray = Object.values(updated);
    const extBrief = typeof existingChallenge?.extended_brief === 'object'
      ? (existingChallenge.extended_brief as Record<string, any>) : {};

    if (sectionKey === 'beneficiaries_mapping') {
      updateMutation.mutate({
        challengeId,
        payload: {
          extended_brief: { ...extBrief, beneficiaries_mapping: newContent },
          ai_section_reviews: reviewsArray,
        },
      });
    } else {
      const dbFieldMap: Record<string, string> = {
        problem_statement: 'problem_statement',
        scope: 'scope',
      };
      const dbCol = dbFieldMap[sectionKey];
      if (dbCol) {
        updateMutation.mutate({
          challengeId,
          payload: { [dbCol]: newContent, ai_section_reviews: reviewsArray },
        });
      }
    }
    toast.success('Refinement accepted and saved.');
  };

  const handleSingleSectionReview = (sectionKey: string, review: SectionReview) => {
    setAiReviews((prev) => {
      const updated = { ...prev, [sectionKey]: review };
      // Persist to DB
      if (challengeId) {
        updateMutation.mutate({ challengeId, payload: { ai_section_reviews: Object.values(updated) } });
      }
      return updated;
    });
  };

  const handleMarkAddressed = (sectionKey: string) => {
    setAiReviews((prev) => {
      const updated = {
        ...prev,
        [sectionKey]: prev[sectionKey] ? { ...prev[sectionKey], addressed: true } : prev[sectionKey],
      };
      // Persist to DB
      if (challengeId) {
        updateMutation.mutate({ challengeId, payload: { ai_section_reviews: Object.values(updated) } });
      }
      return updated;
    });
  };

  // ═══════ Conditional returns ═══════
  const isLoading = orgLoading || modelLoading || segmentsLoading || (isEditMode ? editLoading : tierLoading);
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!isEditMode && tierLimit && !tierLimit.allowed) {
    return (
      <TierLimitModal
        isOpen={showTierLimit || true}
        onClose={() => { setShowTierLimit(false); navigate('/cogni/dashboard'); }}
        tierName={tierLimit.tier_name}
        maxAllowed={tierLimit.max_allowed}
        currentActive={tierLimit.current_active}
      />
    );
  }

  // ═══════ Handlers ═══════
  const handleTemplateSelect = (template: ChallengeTemplate) => {
    setSelectedTemplate(template);
    persistState('cogni_intake_simple_template', template);
    setValue('selected_template', template.id, { shouldValidate: true });
  };

  const buildPayload = (data: SimpleIntakeValues) => {
    const derivedTitle = !isMP && selectedTemplate
      ? `${selectedTemplate.name} Idea`
      : data.title ?? '';

    return {
      orgId: currentOrg?.organizationId ?? '',
      creatorId: user?.id ?? '',
      operatingModel: orgContext?.operatingModel ?? 'AGG',
      title: derivedTitle,
      businessProblem: data.problem_summary,
      expectedOutcomes: data.solution_expectations || '',
      currency: data.currency,
      budgetMin: data.budget_min ?? 0,
      budgetMax: data.budget_max ?? 0,
      expectedTimeline: data.expected_timeline ?? '',
      domainTags: selectedTemplate?.prefill?.domain_tags ?? [],
      urgency: 'standard',
      industrySegmentId: data.industry_segment_id || '',
      templateId: data.selected_template || undefined,
      beneficiariesMapping: (data as any).beneficiaries_mapping || undefined,
      amApprovalRequired: isMP ? ((data as any).am_approval_required ?? true) : false,
    };
  };

  const buildUpdatePayload = (data: SimpleIntakeValues): Record<string, unknown> => ({
    title: data.title || undefined,
    problem_statement: data.problem_summary,
    scope: data.solution_expectations || null,
    reward_structure: {
      currency: data.currency,
      budget_min: data.budget_min ?? 0,
      budget_max: data.budget_max ?? 0,
    },
    phase_schedule: {
      expected_timeline: data.expected_timeline ?? '',
    },
    eligibility: JSON.stringify({
      industry_segment_id: data.industry_segment_id || undefined,
    }),
    extended_brief: {
      ...(data.beneficiaries_mapping ? { beneficiaries_mapping: data.beneficiaries_mapping } : {}),
      ...(data.am_approval_required !== undefined ? { am_approval_required: data.am_approval_required } : {}),
      ...(selectedTemplate?.id ? { challenge_template_id: selectedTemplate.id } : {}),
    },
  });

  const onSubmit = async (data: SimpleIntakeValues) => {
    if (isEditMode) {
      await updateMutation.mutateAsync({ challengeId, payload: buildUpdatePayload(data) });
      navigate('/cogni/dashboard');
      return;
    }
    await submitMutation.mutateAsync(buildPayload(data));
    clearPersistedData();
    clearState('cogni_intake_simple_template');
    navigate('/cogni/dashboard');
  };

  const onSaveDraft = async () => {
    if (isEditMode) {
      const data = getValues();
      await updateMutation.mutateAsync({ challengeId, payload: buildUpdatePayload(data as SimpleIntakeValues) });
      navigate('/cogni/dashboard');
      return;
    }
    const data = getValues();
    await draftMutation.mutateAsync(buildPayload(data as SimpleIntakeValues));
    clearPersistedData();
    clearState('cogni_intake_simple_template');
    navigate('/cogni/my-requests');
  };

  // ═══════ RQ (Aggregator) Render ═══════
  if (!isMP) {
    return (
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          {(isEditMode || isViewMode) && (
            <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isViewMode ? 'View Your Idea' : isEditMode ? 'Edit Your Idea' : 'Share Your Idea'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isViewMode
                ? 'Read-only view of your submitted idea.'
                : isEditMode
                ? 'Update your idea details below. Your changes will be saved immediately.'
                : 'As an internal employee, share your idea — a Challenge Creator from your team will expand it. You don\'t need to know the budget, but please indicate your timeline.'}
            </p>
          </div>
        </div>

        {/* AI Review Button — edit/view mode only */}
{mode === 'edit' && challengeId && (
          <Button variant="outline" size="sm" onClick={handleRunAiReview} disabled={isAiReviewing} className="gap-1.5">
            {isAiReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
            {isAiReviewing ? 'Reviewing…' : 'Review with AI'}
          </Button>
        )}

        <TemplateSelector
          onSelect={handleTemplateSelect}
          selectedId={selectedTemplate?.id}
          disabled={isViewMode}
        />
        {!isViewMode && errors.selected_template && (
          <p className="text-xs text-destructive -mt-3">{errors.selected_template.message}</p>
        )}

        {/* Industry Segment */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Industry Segment {!isViewMode && <span className="text-destructive">*</span>}
            </Label>
            <Controller
              name="industry_segment_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isViewMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an industry segment…" />
                  </SelectTrigger>
                  <SelectContent>
                    {industrySegments.map((seg: any) => (
                      <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {!isViewMode && (
              <p className="text-xs italic text-muted-foreground">
                Required for auto-assigning the right Challenge Creator to your idea.
              </p>
            )}
            {errors.industry_segment_id && <p className="text-xs text-destructive">{errors.industry_segment_id.message}</p>}
          </div>
        </div>

        {/* Step 2: Problem / Idea Editor */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Problem / Possibility Idea {!isViewMode && <span className="text-destructive">*</span>}
              </Label>
              {!isViewMode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setProblemFullscreen(true)}
                >
                  <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expand
                </Button>
              )}
            </div>
            {isViewMode ? (
              <SafeHtmlRenderer html={problemSummary} fallback="No idea provided" />
            ) : (
              <Controller
                name="problem_summary"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Describe the problem or opportunity you've identified. Even a rough idea is fine — a domain expert will expand it into a full specification."
                    storagePath="rq-problem-idea"
                  />
                )}
              />
            )}
            {!isViewMode && (
              <p className="text-xs italic text-muted-foreground">
                Share enough context so an Architect can understand the core issue.
              </p>
            )}
            {errors.problem_summary && <p className="text-xs text-destructive">{errors.problem_summary.message}</p>}
          </div>
{mode === 'edit' && challengeId && (
            <AIReviewInline
              sectionKey="problem_statement"
              review={aiReviews['problem_statement']}
              currentContent={problemSummary}
              challengeId={challengeId}
              challengeContext={{ title: existingChallenge?.title }}
              onAcceptRefinement={handleAcceptRefinement}
              onSingleSectionReview={handleSingleSectionReview}
              onMarkAddressed={handleMarkAddressed}
              roleContext="intake"
              defaultOpen={aiReviews['problem_statement']?.status === 'needs_revision' || aiReviews['problem_statement']?.status === 'warning'}
            />
          )}
        </div>

        <Dialog open={problemFullscreen} onOpenChange={setProblemFullscreen}>
          <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>Problem / Possibility Idea</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto py-2">
              <Controller
                name="problem_summary"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Describe the problem or opportunity you've identified..."
                    storagePath="rq-problem-idea"
                    className="min-h-[60vh]"
                  />
                )}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Step 3: Beneficiaries & Benefits Mapping (Optional) */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Beneficiaries & Benefits Mapping</Label>
                {!isViewMode && <span className="text-xs text-muted-foreground italic">(Optional)</span>}
              </div>
              {!isViewMode && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => setBeneficiariesFullscreen(true)}
                >
                  <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expand
                </Button>
              )}
            </div>
            {isViewMode ? (
              <SafeHtmlRenderer html={watch('beneficiaries_mapping')} fallback="Not provided" />
            ) : (
              <Controller
                name="beneficiaries_mapping"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Who will benefit from solving this? Map stakeholders to expected benefits..."
                    storagePath="rq-beneficiaries"
                  />
                )}
              />
            )}
          </div>
{mode === 'edit' && challengeId && (
            <AIReviewInline
              sectionKey="beneficiaries_mapping"
              review={aiReviews['beneficiaries_mapping']}
              currentContent={watch('beneficiaries_mapping') ?? null}
              challengeId={challengeId}
              challengeContext={{ title: existingChallenge?.title }}
              onAcceptRefinement={handleAcceptRefinement}
              onSingleSectionReview={handleSingleSectionReview}
              onMarkAddressed={handleMarkAddressed}
              roleContext="intake"
              defaultOpen={aiReviews['beneficiaries_mapping']?.status === 'needs_revision' || aiReviews['beneficiaries_mapping']?.status === 'warning'}
            />
          )}
        </div>

        <Dialog open={beneficiariesFullscreen} onOpenChange={setBeneficiariesFullscreen}>
          <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="shrink-0">
              <DialogTitle>Beneficiaries & Benefits Mapping</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto py-2">
              <Controller
                name="beneficiaries_mapping"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="Who will benefit from solving this? Map stakeholders to expected benefits..."
                    storagePath="rq-beneficiaries"
                    className="min-h-[60vh]"
                  />
                )}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Step 4: Timeline Urgency */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Timeline Urgency {!isViewMode && <span className="text-destructive">*</span>}
            </Label>
            <Controller
              name="expected_timeline"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isViewMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.expected_timeline && <p className="text-xs text-destructive">{errors.expected_timeline.message}</p>}
          </div>
        </div>

        {/* Actions — hidden in view mode */}
        {!isViewMode && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isBusy}
              size="lg"
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {isEditMode ? 'Updating…' : 'Submitting…'}</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> {isEditMode ? 'Update Idea' : 'Submit Idea'}</>
              )}
            </Button>
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={onSaveDraft}
                disabled={isBusy}
                size="lg"
              >
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save as Draft</>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════ AM (Marketplace) Render ═══════
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {(isEditMode || isViewMode) && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
          </Button>
        )}
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {isViewMode ? 'View Problem Brief' : isEditMode ? 'Edit Problem Brief' : 'Submit a Problem Brief'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isViewMode
              ? 'Read-only view of your submitted problem brief.'
              : isEditMode
              ? 'Update your problem brief below. All formatting will be preserved.'
              : 'As your organization\'s representative, provide the problem details. Your Challenge Architect will contact you within 2 business days.'}
          </p>
        </div>
      </div>

      {/* AI Review Button — edit/view mode only */}
{mode === 'edit' && challengeId && (
        <Button variant="outline" size="sm" onClick={handleRunAiReview} disabled={isAiReviewing} className="gap-1.5">
          {isAiReviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
          {isAiReviewing ? 'Reviewing…' : 'Review with AI'}
        </Button>
      )}

      {/* Template Selector — create/edit: full grid; view: read-only badge */}
      <TemplateSelector
        onSelect={handleTemplateSelect}
        selectedId={selectedTemplate?.id}
        disabled={isViewMode}
      />

      {/* THE PROBLEM — IN PLAIN BUSINESS LANGUAGE */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">The Problem — In Plain Business Language</p>
        {/* 1. Title */}
        <div className="space-y-1.5">
          <Label htmlFor="si-title" className="text-sm font-medium">
            Title {!isViewMode && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="si-title"
            placeholder="Brief title for your problem brief"
            maxLength={100}
            disabled={isViewMode}
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* 2. Problem Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Problem Summary {!isViewMode && <span className="text-destructive">*</span>}
            </Label>
            {!isViewMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setMpProblemFullscreen(true)}
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expand
              </Button>
            )}
          </div>
          {isViewMode ? (
            <SafeHtmlRenderer html={problemSummary} fallback="No problem summary provided" />
          ) : (
            <Controller
              name="problem_summary"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="What problem needs solving? Describe what is broken, who is affected, and what a good solution would achieve."
                  storagePath="am-problem-summary"
                />
              )}
            />
          )}
          {!isViewMode && (
            <p className="text-xs italic text-muted-foreground">
              Describe what is broken, who is affected, and what a good solution would achieve.
            </p>
          )}
          {errors.problem_summary && <p className="text-xs text-destructive">{errors.problem_summary.message}</p>}
{mode === 'edit' && challengeId && (
            <AIReviewInline
              sectionKey="problem_statement"
              review={aiReviews['problem_statement']}
              currentContent={problemSummary}
              challengeId={challengeId}
              challengeContext={{ title: existingChallenge?.title }}
              onAcceptRefinement={handleAcceptRefinement}
              onSingleSectionReview={handleSingleSectionReview}
              onMarkAddressed={handleMarkAddressed}
              roleContext="intake"
              defaultOpen={aiReviews['problem_statement']?.status === 'needs_revision' || aiReviews['problem_statement']?.status === 'warning'}
            />
          )}
        </div>

        {/* Fullscreen Dialog — MP Problem Summary */}
        {!isViewMode && (
          <Dialog open={mpProblemFullscreen} onOpenChange={setMpProblemFullscreen}>
            <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle>Problem Summary</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto py-2">
                <Controller
                  name="problem_summary"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="What problem needs solving?..."
                      storagePath="am-problem-summary"
                      className="min-h-[60vh]"
                    />
                  )}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 3. Sector / Domain */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Sector / Domain {!isViewMode && <span className="text-destructive">*</span>}
          </Label>
          <Controller
            name="industry_segment_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isViewMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a sector…" />
                </SelectTrigger>
                <SelectContent>
                  {industrySegments.map((seg: any) => (
                    <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.industry_segment_id && <p className="text-xs text-destructive">{errors.industry_segment_id.message}</p>}
        </div>
      </div>

      {/* COMMERCIAL PARAMETERS */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commercial Parameters — Only You Can Provide These</p>

        {/* Budget Range */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Budget Range {!isViewMode && <span className="text-destructive">*</span>}
          </Label>
          <div className="flex items-center gap-3">
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isViewMode}>
                  <SelectTrigger className="w-28 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Input type="number" placeholder="Min" className="flex-1" disabled={isViewMode} {...register('budget_min')} />
            <span className="text-muted-foreground text-sm">–</span>
            <Input type="number" placeholder="Max" className="flex-1" disabled={isViewMode} {...register('budget_max')} />
          </div>
          {errors.budget_min && <p className="text-xs text-destructive">{errors.budget_min.message}</p>}
          {errors.budget_max && <p className="text-xs text-destructive">{errors.budget_max.message}</p>}
        </div>

        {/* Timeline Urgency */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Timeline Urgency {!isViewMode && <span className="text-destructive">*</span>}
          </Label>
          <Controller
            name="expected_timeline"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={isViewMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timeline…" />
                </SelectTrigger>
                <SelectContent>
                  {TIMELINE_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.expected_timeline && <p className="text-xs text-destructive">{errors.expected_timeline.message}</p>}
        </div>

        {/* What success looks like commercially (Optional) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              What success looks like commercially {!isViewMode && <span className="text-xs text-muted-foreground italic">(Optional)</span>}
            </Label>
            {!isViewMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setCommercialFullscreen(true)}
              >
                <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expand
              </Button>
            )}
          </div>
          {isViewMode ? (
            <SafeHtmlRenderer html={solutionExpectations} fallback="Not provided" />
          ) : (
            <Controller
              name="solution_expectations"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="What does a good outcome look like from a business perspective? Helps the Challenge Architect understand your priorities."
                  storagePath="am-commercial-success"
                />
              )}
            />
          )}
          {errors.solution_expectations && <p className="text-xs text-destructive">{errors.solution_expectations.message}</p>}
{mode === 'edit' && challengeId && (
            <AIReviewInline
              sectionKey="scope"
              review={aiReviews['scope']}
              currentContent={solutionExpectations ?? null}
              challengeId={challengeId}
              challengeContext={{ title: existingChallenge?.title }}
              onAcceptRefinement={handleAcceptRefinement}
              onSingleSectionReview={handleSingleSectionReview}
              onMarkAddressed={handleMarkAddressed}
              roleContext="intake"
              defaultOpen={aiReviews['scope']?.status === 'needs_revision' || aiReviews['scope']?.status === 'warning'}
            />
          )}
        </div>

        {!isViewMode && (
          <Dialog open={commercialFullscreen} onOpenChange={setCommercialFullscreen}>
            <DialogContent className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="shrink-0">
                <DialogTitle>What success looks like commercially</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto py-2">
                <Controller
                  name="solution_expectations"
                  control={control}
                  render={({ field }) => (
                    <RichTextEditor
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="What does a good outcome look like from a business perspective?..."
                      storagePath="am-commercial-success"
                      className="min-h-[60vh]"
                    />
                  )}
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Approval Gate Toggle */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 mt-0.5 text-primary shrink-0" />
            <div>
              <Label htmlFor="am-approval-toggle" className="text-sm font-medium text-foreground cursor-pointer">
                Approval required before publishing to Solvers
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, the Curator must send the challenge to you for approval before it goes live.
              </p>
            </div>
          </div>
          <Controller
            name="am_approval_required"
            control={control}
            render={({ field }) => (
              <Switch
                id="am-approval-toggle"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isViewMode}
              />
            )}
          />
        </div>
      </div>

      {/* Actions — hidden in view mode */}
      {!isViewMode && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isBusy}
            size="lg"
            className="flex-1 sm:flex-none"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {isEditMode ? 'Updating…' : 'Submitting…'}</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> {isEditMode ? 'Update Brief' : 'Submit Brief'}</>
            )}
          </Button>
          {!isEditMode && (
            <Button
              variant="outline"
              onClick={onSaveDraft}
              disabled={isBusy}
              size="lg"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save as Draft</>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
