/**
 * CogniSubmitRequestPage — Solution Request form rendered inside CogniShell.
 * Route: /cogni/submit-request
 *
 * Enhanced with: Request Info header, Constraints field, Categorisation section,
 * Business Rules banner, and Attachments support.
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Send, Save, X, Search, Info, ArrowRight, Loader2,
  AlertCircle, Hash, Paperclip, Wand2, Zap, Shield, Lock,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { CreationContextBar } from '@/components/cogniblend/CreationContextBar';
import {
  resolveGovernanceMode,
  getAvailableGovernanceModes,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';
import { extractKeywords, matchTagsByKeywords } from '@/lib/keywordExtractor';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext, useChallengeArchitects } from '@/hooks/queries/useSolutionRequestContext';
import { useDuplicateDetection } from '@/hooks/queries/useDuplicateDetection';
import { DuplicateMatchesPanel, DuplicateWarningBanner } from '@/components/requests/DuplicateMatchesPanel';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import { useSubmitSolutionRequest, useSaveDraft } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useCreateDuplicateReview } from '@/hooks/cogniblend/useDuplicateReview';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTaxonomyCascade } from '@/hooks/queries/useTaxonomyCascade';
import { useEngagementModels } from '@/hooks/queries/useEngagementModels';
import { EngagementModelSelector } from '@/components/org/EngagementModelSelector';
import { useTaxonomySuggestions } from '@/hooks/cogniblend/useTaxonomySuggestions';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { useRoleReadinessGate } from '@/hooks/cogniblend/useRoleReadinessGate';
import { SubmissionBlockedScreen } from '@/components/rbac/SubmissionBlockedScreen';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── AI Draft Button ── */
function AiDraftButton({ loading, onClick, disabled }: { loading: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Wand2 className="h-3 w-3" />
      )}
      {loading ? 'Drafting…' : 'Draft with AI'}
    </button>
  );
}

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
  'AI/ML', 'Biotech', 'Clean Energy', 'Materials Science',
  'Digital Health', 'Manufacturing', 'Software', 'Sustainability',
];

const URGENCY_OPTIONS = [
  { value: 'standard', label: 'Standard', colorClass: 'bg-muted text-muted-foreground border-border' },
  { value: 'urgent', label: 'Urgent', colorClass: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'critical', label: 'Critical', colorClass: 'bg-red-50 text-red-700 border-red-300' },
] as const;

const MIN_PROBLEM_CHARS = 200;

const ATTACHMENT_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ] as const,
  allowedExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'] as const,
  label: 'Attachments',
} as const;

// ============================================================================
// SCHEMA
// ============================================================================

function buildSchema(isMP: boolean) {
  const base = z.object({
    engagement_model: z.enum(['MP', 'AGG']),
    business_problem: z.string()
      .min(MIN_PROBLEM_CHARS, `Business problem must be at least ${MIN_PROBLEM_CHARS} characters`)
      .max(5000, 'Business problem must be 5000 characters or less')
      .trim(),
    expected_outcomes: z.string()
      .min(1, 'Expected outcomes are required')
      .max(2000, 'Expected outcomes must be 2000 characters or less')
      .trim(),
    constraints: z.string().max(2000).optional(),
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
    industry_segment_id: z.string().optional(),
    sub_domain_ids: z.array(z.string()).optional(),
    specialty_tags: z.array(z.string()).optional(),
  });

  return base.refine(data => data.budget_min < data.budget_max, {
    message: 'Minimum must be less than maximum.',
    path: ['budget_min'],
  });
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

// ============================================================================
// DOMAIN TAG MULTI-SELECT
// ============================================================================

function DomainTagSelect({ value, onChange, error, businessProblem = '' }: {
  value: string[];
  onChange: (tags: string[]) => void;
  error?: string;
  businessProblem?: string;
}) {
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = DEFAULT_DOMAIN_TAGS.filter(
    tag => tag.toLowerCase().includes(search.toLowerCase()) && !value.includes(tag)
  );

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

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        Domain Tags <span className="text-destructive">*</span>
      </Label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map(tag => (
            <Badge key={tag} variant="outline" className="gap-1 pr-1 border bg-secondary text-secondary-foreground">
              {tag}
              <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {suggestedTags.length > 0 && (
        <div className="space-y-1 mb-2">
          <p className="text-[12px] text-muted-foreground">Suggested based on your description</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer"
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
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Search domain tags..."
            className="pl-9"
          />
        </div>
        {showDropdown && filtered.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filtered.map(tag => (
              <button key={tag} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors" onClick={() => addTag(tag)}>
                <Badge variant="outline" className="text-xs border bg-secondary">{tag}</Badge>
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
// MAIN PAGE
// ============================================================================

export default function CogniSubmitRequestPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const matchesPanelRef = useRef<HTMLDivElement>(null);

  const [warningDismissed, setWarningDismissed] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [aiDrafting, setAiDrafting] = useState(false);
  const [selectedGovMode, setSelectedGovMode] = useState<GovernanceMode | null>(null);

  const { data: orgContext, isLoading: orgLoading } = useOrgModelContext();
  const { data: tierLimit, isLoading: tierLoading } = useTierLimitCheck();
  const readinessGate = useRoleReadinessGate();
  const { data: architects = [], isLoading: architectsLoading } = useChallengeArchitects();
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();
  const createDuplicateReview = useCreateDuplicateReview();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();
  const { data: engagementModels = [], isLoading: engModelsLoading } = useEngagementModels();

  // Derive default model from org context
  const orgDefaultModel = orgContext?.operatingModel === 'MP' ? 'MP' : 'AGG';

  const form = useForm<FormValues>({
    resolver: zodResolver(buildSchema(orgDefaultModel === 'MP')),
    defaultValues: {
      engagement_model: orgDefaultModel,
      business_problem: '',
      expected_outcomes: '',
      constraints: '',
      currency: 'USD',
      budget_min: 0,
      budget_max: 0,
      expected_timeline: undefined,
      domain_tags: [],
      urgency: 'standard',
      architect_id: '',
      industry_segment_id: '',
      sub_domain_ids: [],
      specialty_tags: [],
    },
    mode: 'onBlur',
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isValid }, getValues } = form;

  // Watch engagement model for reactive behavior
  const watchedModel = watch('engagement_model');
  const isMP = watchedModel === 'MP';
  const isAGG = watchedModel === 'AGG';
  const hasBypass = isAGG && orgContext?.phase1Bypass === true;

  // Rebuild schema reactively when model changes
  const schema = buildSchema(isMP);

  const businessProblem = watch('business_problem');
  const charCount = businessProblem?.length || 0;
  const isMinMet = charCount >= MIN_PROBLEM_CHARS;

  // Taxonomy cascade: industry → proficiency areas → sub-domains → specialities
  const watchedIndustryId = watch('industry_segment_id');
  const watchedSubDomainIds = watch('sub_domain_ids') ?? [];
  const cascadeIndustryIds = useMemo(() => watchedIndustryId ? [watchedIndustryId] : [], [watchedIndustryId]);
  const cascade = useTaxonomyCascade(cascadeIndustryIds);
  const cascadedSubDomains = cascade.subDomains;
  const cascadedSpecialities = useMemo(
    () => cascade.getSpecialitiesBySubDomains(watchedSubDomainIds),
    [cascade.getSpecialitiesBySubDomains, watchedSubDomainIds],
  );


  // Taxonomy suggestions
  const { suggestions: taxonomySuggestions } = useTaxonomySuggestions(businessProblem);

  // Duplicate Detection
  const { matches, isSearching, hasHighSimilarity } = useDuplicateDetection(businessProblem || '');
  const showWarning = hasHighSimilarity && !warningDismissed;

  const scrollToMatches = useCallback(() => {
    matchesPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Request ID (display only)
  const requestId = useMemo(() => {
    const year = new Date().getFullYear();
    return `SR-${year}-NEW`;
  }, []);

  const buildPayload = (data: FormValues) => ({
    orgId: currentOrg?.organizationId ?? '',
    creatorId: user?.id ?? '',
    operatingModel: data.engagement_model,
    businessProblem: data.business_problem,
    expectedOutcomes: data.expected_outcomes,
    constraints: data.constraints || '',
    currency: data.currency,
    budgetMin: data.budget_min,
    budgetMax: data.budget_max,
    expectedTimeline: data.expected_timeline,
    domainTags: data.domain_tags,
    urgency: data.urgency,
    architectId: data.architect_id || undefined,
    industrySegmentId: data.industry_segment_id || undefined,
    subDomainIds: data.sub_domain_ids || [],
    specialtyTags: data.specialty_tags || [],
  });

  const onSubmit = async (data: FormValues) => {
    const result = await submitMutation.mutateAsync(buildPayload(data));

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
        } catch { /* non-blocking */ }
      }
    }

    navigate('/cogni/dashboard');
  };

  const onSaveDraft = async () => {
    const data = getValues();
    await draftMutation.mutateAsync(buildPayload(data as FormValues));
    navigate('/cogni/my-requests');
  };

  const handleAiDraft = async () => {
    const currentProblem = getValues('business_problem') || '';
    setAiDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-field-assist', {
        body: {
          field_name: 'problem_statement',
          context: { problem_statement: currentProblem, governance_mode: currentOrg?.governanceProfile },
        },
      });
      if (error || !data?.success) {
        toast.error(data?.error?.message || 'AI draft failed. Try again.');
        return;
      }
      setValue('business_problem', data.data.content, { shouldValidate: true, shouldDirty: true });
      toast.success('AI draft applied — review and edit as needed.');
    } catch {
      toast.error('Failed to connect to AI.');
    } finally {
      setAiDrafting(false);
    }
  };

  const isSubmitting = submitMutation.isPending;
  const isSaving = draftMutation.isPending;
  const isBusy = isSubmitting || isSaving;

  if (orgLoading || tierLoading || readinessGate.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    );
  }

  // Role readiness gate — block if required downstream roles are missing
  if (!readinessGate.isReady) {
    return (
      <SubmissionBlockedScreen
        orgId={readinessGate.orgId}
        model={readinessGate.model}
        onBack={() => navigate('/cogni/dashboard')}
      />
    );
  }

  const tierBlocked = tierLimit && !tierLimit.allowed;
  if (tierBlocked) {
    return (
      <div className="space-y-6">
        <h1 className="text-[22px] font-bold text-primary">New Solution Request</h1>
        <TierLimitModal
          isOpen={true}
          onClose={() => navigate('/cogni/my-requests')}
          tierName={tierLimit.tier_name}
          maxAllowed={tierLimit.max_allowed}
          currentActive={tierLimit.current_active}
        />
      </div>
    );
  }

  const hasMatches = matches.length > 0;

  return (
    <div className="space-y-5 max-w-[1100px]">
      {/* Page Title */}
      <h1 className="text-[22px] font-bold text-primary">New Solution Request</h1>

      {/* AI Intake Banner */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
        <div className="flex items-start gap-2 flex-1">
          <Wand2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Want a simpler start?</p>
            <p className="text-xs text-muted-foreground">Use AI to draft your challenge — pick a template, describe the problem, and let AI generate the specification.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0" onClick={() => navigate('/cogni/challenges/create')}>
          Create with AI <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Business Rules Banner */}
      <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-start gap-3">
        <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground text-sm">Business Rules Applied</p>
          <p>BR-SR-001: Min {MIN_PROBLEM_CHARS} chars for problem statement · BR-SR-002: Duplicate detection · BR-SR-008: Categorization required</p>
        </div>
      </div>

      {/* Model-specific text */}
      {isMP && (
        <p className="text-sm text-muted-foreground">
          You are submitting this request on behalf of the Seeking Organization. After submission, it will be assigned to a Challenge Architect.
        </p>
      )}
      {isAGG && (
        <p className="text-sm text-muted-foreground">
          Describe your innovation challenge. After submission, you or your team will develop the full challenge specification.
        </p>
      )}

      {/* Bypass Banner */}
      {hasBypass && (
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
          <div className="flex items-start gap-2 flex-1">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Your organization has direct challenge creation enabled. You can skip this request.
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0" onClick={() => navigate('/cogni/challenges/create')}>
            Create Challenge Directly <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Form */}
        <div className="w-full max-w-[720px] space-y-5">

          {/* Request Information Header */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono font-medium text-foreground">{requestId}</span>
                </div>
                <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">Draft</Badge>
                <Badge variant="outline" className={cn(
                  'text-[10px]',
                  isMP ? 'bg-primary/10 text-primary border-primary/20' : 'bg-accent text-accent-foreground border-border'
                )}>
                  {isMP ? 'Marketplace' : 'Aggregator'}
                </Badge>
              </div>

              {/* Engagement Model Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Engagement Model <span className="text-destructive">*</span></Label>
                {engModelsLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : engagementModels.length > 0 ? (
                  <EngagementModelSelector
                    models={engagementModels.map(m => ({
                      id: m.id,
                      name: m.name,
                      code: m.code ?? '',
                      description: m.description,
                    }))}
                    selectedId={engagementModels.find(m => {
                      const c = (m.code ?? '').toLowerCase();
                      return (isMP && (c === 'marketplace' || c === 'mp')) || (isAGG && (c === 'aggregator' || c === 'agg'));
                    })?.id ?? ''}
                    onSelect={(selectedId) => {
                      const selected = engagementModels.find(m => m.id === selectedId);
                      if (selected) {
                        const c = (selected.code ?? '').toLowerCase();
                        const code = (c === 'marketplace' || c === 'mp') ? 'MP' : 'AGG';
                        setValue('engagement_model', code, { shouldValidate: true });
                        if (code === 'AGG') {
                          setValue('architect_id', '', { shouldValidate: false });
                        }
                      }
                    }}
                  />
                ) : (
                  <RadioGroup
                    value={watchedModel}
                    onValueChange={(val) => {
                      setValue('engagement_model', val as 'MP' | 'AGG', { shouldValidate: true });
                      if (val === 'AGG') setValue('architect_id', '', { shouldValidate: false });
                    }}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="MP" id="model-mp" />
                      <Label htmlFor="model-mp" className="text-sm cursor-pointer">Marketplace</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="AGG" id="model-agg" />
                      <Label htmlFor="model-agg" className="text-sm cursor-pointer">Aggregator</Label>
                    </div>
                  </RadioGroup>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* ── Problem Definition ── */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Problem Definition</h3>

                  {/* Business Problem */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="business_problem" className="text-sm font-medium">
                        Problem Statement <span className="text-destructive">*</span>
                      </Label>
                      <AiDraftButton
                        loading={aiDrafting}
                        onClick={handleAiDraft}
                        disabled={isBusy}
                      />
                    </div>
                    <Textarea
                      id="business_problem"
                      {...register('business_problem')}
                      className="min-h-[120px] resize-y"
                      placeholder="Describe the core business challenge, its impact, and what you've tried so far..."
                      disabled={isBusy}
                    />
                    <p className={cn('text-xs transition-colors', isMinMet ? 'text-green-600' : 'text-muted-foreground')}>
                      {charCount} / {MIN_PROBLEM_CHARS} minimum characters
                    </p>
                    {errors.business_problem && <p className="text-sm text-destructive">{errors.business_problem.message}</p>}
                  </div>

                  {/* Expected Outcomes */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="expected_outcomes" className="text-sm font-medium">
                      Desired Outcomes <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="expected_outcomes"
                      {...register('expected_outcomes')}
                      className="min-h-[80px] resize-y"
                      placeholder="Describe measurable outcomes, KPIs, or success criteria..."
                      disabled={isBusy}
                    />
                    {errors.expected_outcomes && <p className="text-sm text-destructive">{errors.expected_outcomes.message}</p>}
                  </div>

                  {/* Constraints */}
                  <div className="space-y-2">
                    <Label htmlFor="constraints" className="text-sm font-medium">Constraints</Label>
                    <Textarea
                      id="constraints"
                      {...register('constraints')}
                      className="min-h-[60px] resize-y"
                      placeholder="Any technical, regulatory, or organizational constraints to consider..."
                      disabled={isBusy}
                    />
                    {errors.constraints && <p className="text-sm text-destructive">{errors.constraints.message}</p>}
                  </div>
                </div>

                {/* ── Categorisation ── */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Categorisation</h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Industry Segment */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Industry Segment</Label>
                      <Controller
                        name="industry_segment_id"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={isBusy}>
                            <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                            <SelectContent>
                              {industrySegments.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Sub-Domains (from cascade) */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Sub-Domains</Label>
                      <Controller
                        name="sub_domain_ids"
                        control={control}
                        render={({ field }) => {
                          const selected = field.value ?? [];
                          const available = cascadedSubDomains.filter(d => !selected.includes(d.id));
                          return (
                            <div>
                              <Select
                                onValueChange={(val) => {
                                  if (!selected.includes(val)) {
                                    field.onChange([...selected, val]);
                                  }
                                }}
                                disabled={isBusy || cascadedSubDomains.length === 0}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={
                                    !watchedIndustryId ? 'Select an industry first' :
                                    cascadedSubDomains.length === 0 ? 'No sub-domains available' :
                                    'Add sub-domains'
                                  } />
                                </SelectTrigger>
                                <SelectContent>
                                  {available.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {selected.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {selected.map(id => {
                                    const sd = cascadedSubDomains.find(d => d.id === id);
                                    return (
                                      <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
                                        {sd?.name ?? id}
                                        <button type="button" onClick={() => field.onChange(selected.filter(s => s !== id))} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5">
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                    </div>
                  </div>

                  {/* Specialties (from cascade + taxonomy suggestions) */}
                  <Controller
                    name="specialty_tags"
                    control={control}
                    render={({ field }) => {
                      const tags = field.value ?? [];
                      // Merge DB specialities with text-based suggestions
                      const dbSpecialities = cascadedSpecialities.filter(s => !tags.includes(s.name));
                      const textSuggestions = taxonomySuggestions.filter(s => !tags.includes(s.tag) && !cascadedSpecialities.some(cs => cs.name === s.tag));
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Specialties</Label>
                          {/* DB-driven specialities */}
                          {dbSpecialities.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {dbSpecialities.slice(0, 12).map(s => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => field.onChange([...tags, s.name])}
                                  className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                                >
                                  + {s.name}
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Text-based suggestions */}
                          {textSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {textSuggestions.slice(0, 8).map(s => (
                                <button
                                  key={s.tag}
                                  type="button"
                                  onClick={() => field.onChange([...tags, s.tag])}
                                  className="inline-flex items-center rounded-full border border-accent/50 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent/20 transition-colors"
                                >
                                  + {s.tag}
                                </button>
                              ))}
                            </div>
                          )}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {tags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="gap-1 pr-1 text-xs">
                                  {tag}
                                  <button type="button" onClick={() => field.onChange(tags.filter((t: string) => t !== tag))} className="ml-0.5 rounded-full hover:bg-black/10 p-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {tags.length === 0 && dbSpecialities.length === 0 && textSuggestions.length === 0
                              ? watchedSubDomainIds.length === 0
                                ? 'Select sub-domains to see specialties, or type 100+ characters for suggestions'
                                : 'No specialties found for selected sub-domains'
                              : `${tags.length} specialties selected`}
                          </p>
                        </div>
                      );
                    }}
                  />
                </div>

                {/* ── Domain Tags ── */}
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

                {/* ── Budget & Timeline ── */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-4">Budget & Timeline</h3>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Estimated Budget Range <span className="text-destructive">*</span></Label>
                      <div className="flex flex-col lg:flex-row gap-3">
                        <Controller
                          name="currency"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={isBusy}>
                              <SelectTrigger className="w-full lg:w-[140px]"><SelectValue placeholder="Currency" /></SelectTrigger>
                              <SelectContent>
                                {CURRENCY_OPTIONS.map(c => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <div className="flex-1">
                          <Input type="number" placeholder="From" {...register('budget_min')} min={0} disabled={isBusy} />
                        </div>
                        <div className="flex-1">
                          <Input type="number" placeholder="To" {...register('budget_max')} min={0} disabled={isBusy} />
                        </div>
                      </div>
                      {errors.budget_min && <p className="text-sm text-destructive">{errors.budget_min.message}</p>}
                      {errors.budget_max && <p className="text-sm text-destructive">{errors.budget_max.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Desired Timeline <span className="text-destructive">*</span></Label>
                      <Controller
                        name="expected_timeline"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={isBusy}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select timeline" /></SelectTrigger>
                            <SelectContent>
                              {TIMELINE_OPTIONS.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.expected_timeline && <p className="text-sm text-destructive">{errors.expected_timeline.message}</p>}
                    </div>
                  </div>
                </div>

                {/* ── Urgency ── */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Urgency</Label>
                  <Controller
                    name="urgency"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="flex flex-col sm:flex-row gap-3" disabled={isBusy}>
                        {URGENCY_OPTIONS.map(opt => (
                          <label
                            key={opt.value}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-4 py-3 cursor-pointer transition-all',
                              field.value === opt.value ? opt.colorClass : 'border-border bg-background hover:bg-accent/50'
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

                {/* ── Architect (MP only) ── */}
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
                              architectsLoading ? 'Loading architects...' : architects.length === 0 ? 'No architects available' : 'Select a Challenge Architect'
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {architects.map(a => (
                              <SelectItem key={a.userId} value={a.userId}>
                                {a.userName}
                                {a.userName !== a.userEmail && <span className="text-muted-foreground ml-2 text-xs">({a.userEmail})</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {architects.length === 0 && !architectsLoading && (
                      <p className="text-xs text-amber-600">No users with the Challenge Architect (R3) role found.</p>
                    )}
                    {errors.architect_id && <p className="text-sm text-destructive">{errors.architect_id.message}</p>}
                  </div>
                )}

                {/* ── Attachments ── */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Attachments</Label>
                  </div>
                  <FileUploadZone
                    config={ATTACHMENT_CONFIG}
                    multiple
                    files={attachments}
                    onFilesChange={setAttachments}
                    onChange={() => {}}
                    disabled={isBusy}
                  />
                </div>

                {/* Duplicate Warning */}
                {showWarning && (
                  <DuplicateWarningBanner
                    onViewMatches={scrollToMatches}
                    onDismiss={() => setWarningDismissed(true)}
                  />
                )}

                <div className="lg:hidden">
                  {hasMatches && (
                    <DuplicateMatchesPanel ref={matchesPanelRef} matches={matches} isSearching={isSearching} />
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isBusy}>Cancel</Button>
                  <Button type="button" variant="outline" onClick={onSaveDraft} disabled={isBusy} className="gap-2">
                    {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save Draft</>}
                  </Button>
                  <Button type="submit" disabled={isBusy || !isValid} className="w-full sm:w-auto h-11 gap-2">
                    {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : <><Send className="h-4 w-4" />Submit Request</>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Duplicate Matches Panel — RIGHT side on desktop */}
        <div className="hidden lg:block w-full max-w-[340px] sticky top-8">
          {hasMatches && (
            <DuplicateMatchesPanel ref={matchesPanelRef} matches={matches} isSearching={isSearching} />
          )}
        </div>
      </div>
    </div>
  );
}
