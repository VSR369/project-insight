/**
 * New Solution Request Page
 * Route: /requests/new
 * 
 * Model-specific behavior:
 * - MP: Account Manager submits on behalf of org, assigns to Challenge Architect (CR/R3)
 * - AGG: Challenge Requestor submits. If phase1_bypass enabled, can skip to /challenges/new
 * - AGG + no bypass: Standard form submission
 * 
 * GATE-01: check_tier_limit blocks form if org is at capacity.
 * BR-SR-005: Duplicate detection — informational, not blocking.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Save, X, Search, Info, ArrowRight, Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { extractKeywords, matchTagsByKeywords } from '@/lib/keywordExtractor';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext, useChallengeArchitects } from '@/hooks/queries/useSolutionRequestContext';
import { useDuplicateDetection } from '@/hooks/queries/useDuplicateDetection';
import { DuplicateMatchesPanel, DuplicateWarningBanner } from '@/components/requests/DuplicateMatchesPanel';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import { useSubmitSolutionRequest, useSaveDraft } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useCreateDuplicateReview } from '@/hooks/cogniblend/useDuplicateReview';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';

// ============================================================================
// CONSTANTS
// ============================================================================

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

const DEFAULT_DOMAIN_TAGS = [
  'AI/ML',
  'Biotech',
  'Clean Energy',
  'Materials Science',
  'Digital Health',
  'Manufacturing',
  'Software',
  'Sustainability',
];

const URGENCY_OPTIONS = [
  { value: 'standard', label: 'Standard', colorClass: 'bg-muted text-muted-foreground border-border' },
  { value: 'urgent', label: 'Urgent', colorClass: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'critical', label: 'Critical', colorClass: 'bg-red-50 text-red-700 border-red-300' },
] as const;

const MIN_PROBLEM_CHARS = 200;

// ============================================================================
// VALIDATION SCHEMA (dynamic — architect_id required only for MP)
// ============================================================================

function buildSchema(isMP: boolean) {
  const base = z.object({
    business_problem: z.string()
      .min(MIN_PROBLEM_CHARS, `Business problem must be at least ${MIN_PROBLEM_CHARS} characters`)
      .max(5000, 'Business problem must be 5000 characters or less')
      .trim(),
    expected_outcomes: z.string()
      .min(1, 'Expected outcomes are required')
      .max(2000, 'Expected outcomes must be 2000 characters or less')
      .trim(),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR'], {
      errorMap: () => ({ message: 'Please select a currency' }),
    }),
    budget_min: z.coerce.number().min(0, 'Minimum budget must be 0 or more'),
    budget_max: z.coerce.number().min(1, 'Maximum budget is required'),
    expected_timeline: z.enum(['1-3', '3-6', '6-12', '12+'], {
      errorMap: () => ({ message: 'Please select a timeline' }),
    }),
    domain_tags: z.array(z.string()).min(1, 'At least one domain tag is required'),
    urgency: z.enum(['standard', 'urgent', 'critical']).default('standard'),
    architect_id: isMP
      ? z.string().min(1, 'Please assign a Challenge Architect')
      : z.string().optional(),
  });

  return base.refine(data => data.budget_min < data.budget_max, {
    message: 'Minimum must be less than maximum.',
    path: ['budget_min'],
  });
}

type SolutionRequestFormValues = z.infer<ReturnType<typeof buildSchema>>;

// ============================================================================
// DOMAIN TAG MULTI-SELECT COMPONENT
// ============================================================================

interface DomainTagSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  businessProblem?: string;
}

function DomainTagSelect({ value, onChange, error, businessProblem = '' }: DomainTagSelectProps) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = DEFAULT_DOMAIN_TAGS.filter(
    tag => tag.toLowerCase().includes(search.toLowerCase()) && !value.includes(tag)
  );

  // Auto-suggest tags based on business problem keywords
  const suggestedTags = useMemo(() => {
    if (!businessProblem || businessProblem.length < 100) return [];
    const keywords = extractKeywords(businessProblem, 5);
    return matchTagsByKeywords(keywords, DEFAULT_DOMAIN_TAGS, value);
  }, [businessProblem, value]);

  const addTag = useCallback((tag: string) => {
    onChange([...value, tag]);
    setSearch('');
    setShowDropdown(false);
  }, [value, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(value.filter(t => t !== tag));
  }, [value, onChange]);

  const TAG_COLORS: Record<string, string> = {
    'AI/ML': 'bg-violet-100 text-violet-700 border-violet-200',
    'Biotech': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Clean Energy': 'bg-green-100 text-green-700 border-green-200',
    'Materials Science': 'bg-sky-100 text-sky-700 border-sky-200',
    'Digital Health': 'bg-pink-100 text-pink-700 border-pink-200',
    'Manufacturing': 'bg-orange-100 text-orange-700 border-orange-200',
    'Software': 'bg-blue-100 text-blue-700 border-blue-200',
    'Sustainability': 'bg-teal-100 text-teal-700 border-teal-200',
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Domain Tags <span className="text-destructive">*</span>
      </Label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className={cn('gap-1 pr-1 border', TAG_COLORS[tag] || 'bg-secondary text-secondary-foreground')}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      {/* Suggested Tags Row */}
      {suggestedTags.length > 0 && (
        <div className="space-y-1 mb-2">
          <p className="text-[12px] text-muted-foreground">
            Suggested based on your description
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="inline-flex items-center rounded-full border border-blue-300 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search domain tags..."
            className="pl-9"
          />
        </div>

        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.map(tag => (
              <button
                key={tag}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                onClick={() => addTag(tag)}
              >
                <Badge
                  variant="outline"
                  className={cn('text-xs border', TAG_COLORS[tag] || 'bg-secondary')}
                >
                  {tag}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function NewSolutionRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const matchesPanelRef = useRef<HTMLDivElement>(null);

  // ── State ──
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);

  // ── Hooks (always called, unconditionally) ──
  const { data: orgContext, isLoading: orgLoading } = useOrgModelContext();
  const { data: tierLimit, isLoading: tierLoading } = useTierLimitCheck();
  const { data: architects = [], isLoading: architectsLoading } = useChallengeArchitects();
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();
  const createDuplicateReview = useCreateDuplicateReview();

  const isMP = orgContext?.operatingModel === 'MP';
  const isAGG = orgContext?.operatingModel === 'AGG';
  const hasBypass = isAGG && orgContext?.phase1Bypass === true;

  const schema = buildSchema(isMP);

  const form = useForm<SolutionRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      business_problem: '',
      expected_outcomes: '',
      currency: 'USD',
      budget_min: 0,
      budget_max: 0,
      expected_timeline: undefined,
      domain_tags: [],
      urgency: 'standard',
      architect_id: '',
    },
    mode: 'onBlur',
  });

  const { register, control, handleSubmit, watch, formState: { errors, isValid }, getValues } = form;

  const businessProblem = watch('business_problem');
  const charCount = businessProblem?.length || 0;
  const isMinMet = charCount >= MIN_PROBLEM_CHARS;

  // ── Duplicate Detection ──
  const { matches, isSearching, hasHighSimilarity } = useDuplicateDetection(businessProblem || '');
  const showWarning = hasHighSimilarity && !warningDismissed;

  const scrollToMatches = useCallback(() => {
    matchesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ── Shared payload builder ──
  const buildPayload = (data: SolutionRequestFormValues) => ({
    orgId: currentOrg?.organizationId ?? '',
    creatorId: user?.id ?? '',
    operatingModel: orgContext?.operatingModel ?? 'AGG',
    businessProblem: data.business_problem,
    expectedOutcomes: data.expected_outcomes,
    currency: data.currency,
    budgetMin: data.budget_min,
    budgetMax: data.budget_max,
    expectedTimeline: data.expected_timeline,
    domainTags: data.domain_tags,
    urgency: data.urgency,
    architectId: data.architect_id || undefined,
  });

  const onSubmit = async (data: SolutionRequestFormValues) => {
    const result = await submitMutation.mutateAsync(buildPayload(data));

    // Create duplicate review records for high-similarity matches (≥3 keyword hits ≈ >80%)
    if (hasHighSimilarity && matches.length > 0) {
      const highMatches = matches.filter(m => m.keywordHits >= 3);
      for (const match of highMatches) {
        const similarityPercent = Math.min(Math.round((match.keywordHits / 4) * 100), 100);
        try {
          await createDuplicateReview.mutateAsync({
            challengeId: result.challengeId,
            matchedChallengeId: match.id,
            similarityPercent,
          });
        } catch {
          // Non-blocking: review creation failure shouldn't block submission
        }
      }
    }

    navigate('/dashboard');
  };

  const onSaveDraft = async () => {
    const data = getValues();
    await draftMutation.mutateAsync(buildPayload(data as SolutionRequestFormValues));
    navigate('/requests');
  };

  const isSubmitting = submitMutation.isPending;
  const isSaving = draftMutation.isPending;
  const isBusy = isSubmitting || isSaving;

  // ── Loading state ──
  if (orgLoading || tierLoading) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-[720px] mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // ── GATE-01: Tier limit reached — show modal instead of form ──
  const tierBlocked = tierLimit && !tierLimit.allowed;

  if (tierBlocked) {
    return (
      <div className="min-h-screen bg-muted/30 py-8 px-4">
        <div className="max-w-[720px] mx-auto space-y-6">
          <h1 className="text-[22px] font-bold text-primary">
            New Solution Request
          </h1>
          <TierLimitModal
            isOpen={true}
            onClose={() => navigate('/requests')}
            tierName={tierLimit.tier_name}
            maxAllowed={tierLimit.max_allowed}
            currentActive={tierLimit.current_active}
          />
        </div>
      </div>
    );
  }

  const hasMatches = matches.length > 0;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-[1100px] mx-auto space-y-6">
        {/* Page Title */}
        <h1 className="text-[22px] font-bold text-primary">
          New Solution Request
        </h1>

        {/* Model-specific header text */}
        {isMP && (
          <p className="text-sm text-muted-foreground max-w-[720px]">
            As Account Manager, you are submitting this request on behalf of the Seeking Organization. After submission, it will be assigned to a Challenge Architect.
          </p>
        )}
        {isAGG && (
          <p className="text-sm text-muted-foreground max-w-[720px]">
            Describe your innovation challenge. After submission, you or your team will develop the full challenge specification.
          </p>
        )}

        {/* AGG + Phase 1 Bypass Banner */}
        {hasBypass && (
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 max-w-[720px]">
            <div className="flex items-start gap-2 flex-1">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Your organization has direct challenge creation enabled. You can skip this request and create a challenge directly.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
              onClick={() => navigate('/challenges/new')}
            >
              Create Challenge Directly
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Main layout: Form + Matches Panel side by side on desktop */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Form Card */}
          <Card className="rounded-xl border-border shadow-sm w-full max-w-[720px]">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* 1. Business Problem */}
                <div className="space-y-2">
                  <Label htmlFor="business_problem" className="text-sm font-medium">
                    Describe the business problem you want to solve <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="business_problem"
                    {...register('business_problem')}
                    className="min-h-[120px] resize-y"
                    placeholder="Describe the core business challenge, its impact, and what you've tried so far..."
                    disabled={isBusy}
                  />
                  <p className={cn(
                    'text-xs transition-colors',
                    isMinMet ? 'text-green-600' : 'text-muted-foreground'
                  )}>
                    {charCount} / {MIN_PROBLEM_CHARS} minimum characters
                  </p>
                  {errors.business_problem && (
                    <p className="text-sm text-destructive">{errors.business_problem.message}</p>
                  )}
                </div>

                {/* 2. Expected Outcomes */}
                <div className="space-y-2">
                  <Label htmlFor="expected_outcomes" className="text-sm font-medium">
                    What outcomes do you expect from a successful solution? <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="expected_outcomes"
                    {...register('expected_outcomes')}
                    className="min-h-[80px] resize-y"
                    placeholder="Describe measurable outcomes, KPIs, or success criteria..."
                    disabled={isBusy}
                  />
                  {errors.expected_outcomes && (
                    <p className="text-sm text-destructive">{errors.expected_outcomes.message}</p>
                  )}
                </div>

                {/* 3. Budget Range */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Budget Range <span className="text-destructive">*</span></Label>
                  <div className="flex flex-col lg:flex-row gap-3">
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={isBusy}>
                          <SelectTrigger className="w-full lg:w-[140px]">
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Minimum Budget"
                        {...register('budget_min')}
                        min={0}
                        disabled={isBusy}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Maximum Budget"
                        {...register('budget_max')}
                        min={0}
                        disabled={isBusy}
                      />
                    </div>
                  </div>
                  {errors.budget_min && (
                    <p className="text-sm text-destructive">{errors.budget_min.message}</p>
                  )}
                  {errors.budget_max && (
                    <p className="text-sm text-destructive">{errors.budget_max.message}</p>
                  )}
                </div>

                {/* 4. Expected Timeline */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Expected Timeline <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    name="expected_timeline"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange} disabled={isBusy}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select expected timeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMELINE_OPTIONS.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.expected_timeline && (
                    <p className="text-sm text-destructive">{errors.expected_timeline.message}</p>
                  )}
                </div>

                {/* 5. Domain Tags */}
                <Controller
                  name="domain_tags"
                  control={control}
                  render={({ field }) => (
                    <DomainTagSelect
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.domain_tags?.message}
                      businessProblem={businessProblem}
                    />
                  )}
                />

                {/* 6. Urgency */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Urgency</Label>
                  <Controller
                    name="urgency"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col sm:flex-row gap-3"
                        disabled={isBusy}
                      >
                        {URGENCY_OPTIONS.map(opt => (
                          <label
                            key={opt.value}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-4 py-3 cursor-pointer transition-all',
                              field.value === opt.value
                                ? opt.colorClass
                                : 'border-border bg-background hover:bg-accent/50'
                            )}
                          >
                            <RadioGroupItem value={opt.value} />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  />
                </div>

                {/* 7. Assign to Challenge Architect (MP only) */}
                {isMP && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Assign to Challenge Architect <span className="text-destructive">*</span>
                    </Label>
                    <Controller
                      name="architect_id"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange} disabled={isBusy}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={
                              architectsLoading
                                ? 'Loading architects...'
                                : architects.length === 0
                                  ? 'No architects available'
                                  : 'Select a Challenge Architect'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {architects.map(a => (
                              <SelectItem key={a.userId} value={a.userId}>
                                <span>{a.userName}</span>
                                {a.userName !== a.userEmail && (
                                  <span className="text-muted-foreground ml-2 text-xs">
                                    ({a.userEmail})
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {architects.length === 0 && !architectsLoading && (
                      <p className="text-xs text-amber-600">
                        No users with the Challenge Architect (R3) role found in your organization. Please assign this role first.
                      </p>
                    )}
                    {errors.architect_id && (
                      <p className="text-sm text-destructive">{errors.architect_id.message}</p>
                    )}
                  </div>
                )}

                {/* Duplicate Warning Banner (advisory, dismissible) */}
                {showWarning && (
                  <DuplicateWarningBanner
                    onViewMatches={scrollToMatches}
                    onDismiss={() => setWarningDismissed(true)}
                  />
                )}

                {/* Duplicate matches — shown below form on mobile */}
                <div className="lg:hidden">
                  {hasMatches && (
                    <DuplicateMatchesPanel
                      ref={matchesPanelRef}
                      matches={matches}
                      isSearching={isSearching}
                    />
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    disabled={isBusy}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onSaveDraft}
                    disabled={isBusy}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Draft
                      </>
                    )}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isBusy || !isValid}
                    className="w-full sm:w-auto h-11 gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Duplicate Matches Panel — RIGHT side on desktop */}
          <div className="hidden lg:block w-full max-w-[340px] sticky top-8">
            {hasMatches && (
              <DuplicateMatchesPanel
                ref={matchesPanelRef}
                matches={matches}
                isSearching={isSearching}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
