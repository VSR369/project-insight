/**
 * SimpleIntakeForm — Model-adaptive intake form for AM/RQ roles.
 * AGG (RQ): 3-field "Share Your Idea" — Title, Problem Idea, Sector.
 * MP (AM): 6-field "Submit a Problem Brief" — Title, Problem Summary, Solution Expectations, Sector, Budget, Timeline.
 * On submit: creates challenge at Phase 1 and assigns an Architect (MP only).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Save, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext, useChallengeArchitects } from '@/hooks/queries/useSolutionRequestContext';
import { useSubmitSolutionRequest, useSaveDraft } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Constants ── */

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
] as const;

const TIMELINE_OPTIONS = [
  { value: '1-3', label: '1–3 months' },
  { value: '3-6', label: '3–6 months' },
  { value: '6-12', label: '6–12 months' },
  { value: '12+', label: '12+ months' },
] as const;

/* ── Schemas ── */

/** AGG (RQ) schema — lightweight 3-field idea submission */
const aggSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  problem_summary: z.string().trim().min(1, 'Problem idea is required').max(300, 'Keep your idea under 300 characters'),
  industry_segment_id: z.string().min(1, 'Please select a sector'),
  // MP-only fields present but optional in AGG schema for unified form type
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
  budget_min: z.coerce.number().optional(),
  budget_max: z.coerce.number().optional(),
  expected_timeline: z.enum(['1-3', '3-6', '6-12', '12+']).optional(),
  solution_expectations: z.string().optional(),
  architect_id: z.string().optional(),
});

/** MP (AM) schema — comprehensive 6-field problem brief */
const mpSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  problem_summary: z.string().trim().min(1, 'Problem summary is required').max(500, 'Problem summary must be 500 characters or less'),
  industry_segment_id: z.string().min(1, 'Please select a sector'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
  budget_min: z.coerce.number().min(0, 'Minimum budget must be 0 or more'),
  budget_max: z.coerce.number().min(1, 'Maximum budget is required'),
  expected_timeline: z.enum(['1-3', '3-6', '6-12', '12+'], {
    errorMap: () => ({ message: 'Please select a timeline' }),
  }),
  solution_expectations: z.string().trim().min(1, 'Solution expectations are required').max(500, 'Keep under 500 characters'),
  architect_id: z.string().optional(),
}).refine(data => data.budget_min! < data.budget_max!, {
  message: 'Minimum must be less than maximum.',
  path: ['budget_min'],
});

type SimpleIntakeValues = z.infer<typeof mpSchema>;

/* ── Component ── */

export function SimpleIntakeForm() {
  // ═══════ Hooks — state ═══════
  const [showTierLimit, setShowTierLimit] = useState(false);

  // ═══════ Hooks — context ═══════
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext, isLoading: modelLoading } = useOrgModelContext();
  const { data: tierLimit, isLoading: tierLoading } = useTierLimitCheck();
  const { data: industrySegments = [], isLoading: segmentsLoading } = useIndustrySegmentOptions();
  const { data: architects = [] } = useChallengeArchitects();

  // ═══════ Hooks — mutations ═══════
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();

  // ═══════ Hooks — form ═══════
  const isMP = orgContext?.operatingModel === 'MP';

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
    },
    mode: 'onBlur',
  });

  const { register, control, handleSubmit, watch, getValues, formState: { errors } } = form;
  const problemSummary = watch('problem_summary');
  const solutionExpectations = watch('solution_expectations');
  const charCount = problemSummary?.length ?? 0;
  const solutionCharCount = solutionExpectations?.length ?? 0;

  // ═══════ Derived ═══════
  const isSubmitting = submitMutation.isPending;
  const isSaving = draftMutation.isPending;
  const isBusy = isSubmitting || isSaving;
  const maxProblemChars = isMP ? 500 : 300;

  // ═══════ Conditional returns ═══════
  if (orgLoading || modelLoading || tierLoading || segmentsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (tierLimit && !tierLimit.allowed) {
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
  const buildPayload = (data: SimpleIntakeValues) => ({
    orgId: currentOrg?.organizationId ?? '',
    creatorId: user?.id ?? '',
    operatingModel: orgContext?.operatingModel ?? 'AGG',
    businessProblem: data.problem_summary,
    expectedOutcomes: data.solution_expectations || '',
    currency: data.currency,
    budgetMin: data.budget_min ?? 0,
    budgetMax: data.budget_max ?? 0,
    expectedTimeline: data.expected_timeline ?? '',
    domainTags: [],
    urgency: 'standard',
    architectId: data.architect_id || undefined,
    industrySegmentId: data.industry_segment_id,
  });

  const onSubmit = async (data: SimpleIntakeValues) => {
    await submitMutation.mutateAsync(buildPayload(data));
    navigate('/cogni/dashboard');
  };

  const onSaveDraft = async () => {
    const data = getValues();
    await draftMutation.mutateAsync(buildPayload(data as SimpleIntakeValues));
    navigate('/cogni/my-requests');
  };

  // ═══════ Render ═══════
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {isMP ? 'Submit a Problem Brief' : 'Share Your Idea'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isMP
            ? 'As your organization\'s representative, provide the problem details. The platform team will manage the challenge lifecycle.'
            : 'Share your problem or opportunity — a Challenge Architect will define the full specification.'
          }
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        {/* 1. Title */}
        <div className="space-y-1.5">
          <Label htmlFor="si-title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="si-title"
            placeholder={isMP ? 'Brief title for your problem brief' : 'Give your idea a short title'}
            maxLength={100}
            {...register('title')}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        {/* 2. Problem Summary / Problem Idea */}
        <div className="space-y-1.5">
          <Label htmlFor="si-problem" className="text-sm font-medium">
            {isMP ? 'Problem Summary' : 'Problem Idea'} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="si-problem"
            placeholder={isMP
              ? 'What problem needs solving?'
              : 'What problem or opportunity have you identified?'
            }
            rows={isMP ? 4 : 3}
            maxLength={maxProblemChars}
            className="text-base resize-none"
            {...register('problem_summary')}
          />
          <p className="text-xs italic text-muted-foreground">
            {isMP
              ? 'Describe what is broken, who is affected, and what a good solution would achieve.'
              : 'Even a rough idea is fine — a domain expert will expand it into a full specification.'
            }
          </p>
          <div className="flex justify-end">
            <span className="text-xs text-muted-foreground">{charCount} / {maxProblemChars}</span>
          </div>
          {errors.problem_summary && <p className="text-xs text-destructive">{errors.problem_summary.message}</p>}
        </div>

        {/* 3. Solution Expectations (MP only) */}
        {isMP && (
          <div className="space-y-1.5">
            <Label htmlFor="si-expectations" className="text-sm font-medium">
              Solution Expectations <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="si-expectations"
              placeholder="What outcomes do you expect? What does a successful solution look like?"
              rows={3}
              maxLength={500}
              className="text-base resize-none"
              {...register('solution_expectations')}
            />
            <div className="flex justify-end">
              <span className="text-xs text-muted-foreground">{solutionCharCount} / 500</span>
            </div>
            {errors.solution_expectations && <p className="text-xs text-destructive">{errors.solution_expectations.message}</p>}
          </div>
        )}

        {/* Sector / Domain */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Sector / Domain <span className="text-destructive">*</span>
          </Label>
          <Controller
            name="industry_segment_id"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
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

        {/* Budget Range (MP only) */}
        {isMP && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Budget Range <span className="text-destructive">*</span>
            </Label>
            <div className="flex items-center gap-3">
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
              <Input type="number" placeholder="Min" className="flex-1" {...register('budget_min')} />
              <span className="text-muted-foreground text-sm">–</span>
              <Input type="number" placeholder="Max" className="flex-1" {...register('budget_max')} />
            </div>
            {errors.budget_min && <p className="text-xs text-destructive">{errors.budget_min.message}</p>}
            {errors.budget_max && <p className="text-xs text-destructive">{errors.budget_max.message}</p>}
          </div>
        )}

        {/* Timeline (MP only) */}
        {isMP && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Expected Timeline <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="expected_timeline"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
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
        )}

        {/* Architect picker (MP model only) */}
        {isMP && architects.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Assign Challenge Architect
            </Label>
            <Controller
              name="architect_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an architect…" />
                  </SelectTrigger>
                  <SelectContent>
                    {architects.map((a: any) => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={isBusy}
          size="lg"
          className="flex-1 sm:flex-none"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
          ) : (
            <><Send className="h-4 w-4 mr-2" /> {isMP ? 'Submit Brief' : 'Submit Idea'}</>
          )}
        </Button>
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
      </div>
    </div>
  );
}
