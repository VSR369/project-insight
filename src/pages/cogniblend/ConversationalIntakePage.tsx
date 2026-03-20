/**
 * ConversationalIntakePage — Simplified "front door" for challenge creation.
 * Presents: Template → Problem → Expected Outcomes → Maturity → Prize → Deadline → Files → "Generate with AI".
 *
 * Exports:
 *   - default: Standalone page (backward compat)
 *   - ConversationalIntakeContent: Embeddable content used by ChallengeCreatePage
 *
 * Governance-aware: routes post-generation to spec review (QUICK/STRUCTURED)
 * or side-panel editor (CONTROLLED) instead of auto-switching to Advanced Editor.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import {
  Sparkles,
  ArrowRight,
  Wand2,
  Settings2,
  ShieldCheck,
  CalendarIcon,
  Upload,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useSubmitSolutionRequest } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useSaveChallengeStep } from '@/hooks/queries/useChallengeForm';
import { useGenerateChallengeSpec, type GeneratedSpec } from '@/hooks/mutations/useGenerateChallengeSpec';
import { TemplateSelector } from '@/components/cogniblend/TemplateSelector';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { computeSolverAssignment } from '@/lib/cogniblend/solverAutoAssign';
import { getPostGenerationRoute, shouldRequireAdvancedEditor } from '@/lib/challengeNavigation';
import { MATURITY_LABELS, MATURITY_DESCRIPTIONS } from '@/lib/maturityLabels';
import type { ChallengeTemplate } from '@/lib/challengeTemplates';
import type { SharedIntakeState } from './ChallengeCreatePage';

/* ─── Constants ───────────────────────────────────────── */

const MIN_DEADLINE_DAYS = 30;
const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'INR', label: 'INR (₹)' },
];

/* ─── Schema ──────────────────────────────────────────── */

const intakeSchema = z.object({
  problem_statement: z
    .string()
    .trim()
    .min(20, 'Describe the challenge in at least 20 characters')
    .max(5000, 'Keep the description under 5,000 characters'),
  expected_outcomes: z
    .string()
    .trim()
    .min(10, 'Describe expected outcomes in at least 10 characters')
    .max(2000, 'Keep expected outcomes under 2,000 characters'),
  maturity_level: z.enum(['blueprint', 'poc', 'prototype', 'pilot'], {
    required_error: 'Select a maturity level',
  }),
  prize_amount: z.coerce
    .number()
    .min(1, 'Prize amount must be at least 1')
    .max(10_000_000, 'Prize amount seems too high'),
  currency_code: z.string().min(1, 'Select a currency').default('USD'),
  deadline: z.date({
    required_error: 'Select a submission deadline',
  }).refine(
    (d) => d >= addDays(new Date(), MIN_DEADLINE_DAYS),
    `Deadline must be at least ${MIN_DEADLINE_DAYS} days from today`,
  ),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;

/* ─── Maturity Level Card ─────────────────────────────── */

const MATURITY_KEYS = ['blueprint', 'poc', 'prototype', 'pilot'] as const;

function MaturityCard({
  level,
  selected,
  onSelect,
}: {
  level: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative flex flex-col items-start gap-1 rounded-xl border p-4 text-left
        transition-all duration-150 hover:shadow-md
        ${selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:border-primary/40'
        }
      `}
    >
      <span className="text-sm font-semibold text-foreground">
        {MATURITY_LABELS[level] ?? level}
      </span>
      <span className="text-xs text-muted-foreground leading-relaxed">
        {MATURITY_DESCRIPTIONS[level] ?? ''}
      </span>
    </button>
  );
}

/* ─── File Upload Pill ────────────────────────────────── */

function FileUploadArea({
  files,
  onAdd,
  onRemove,
}: {
  files: File[];
  onAdd: (files: FileList) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground">
        Supporting Files
        <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
      </label>
      <p className="text-xs text-muted-foreground">
        Upload briefs, datasets, or reference documents (PDF, DOCX, XLSX — max 10 MB each).
      </p>
      <div className="flex flex-wrap gap-2">
        {files.map((f, i) => (
          <Badge key={i} variant="secondary" className="gap-1 text-xs pr-1">
            {f.name}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <label className="inline-flex items-center gap-1 cursor-pointer text-xs text-primary hover:underline">
          <Upload className="h-3.5 w-3.5" />
          Add file
          <input
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt"
            onChange={(e) => e.target.files && onAdd(e.target.files)}
          />
        </label>
      </div>
    </div>
  );
}

/* ─── Content Component (embeddable) ──────────────────── */

interface ConversationalIntakeContentProps {
  onSwitchToEditor?: () => void;
  sharedState?: SharedIntakeState;
  onStateChange?: (partial: Partial<SharedIntakeState>) => void;
  onSpecGenerated?: (spec: GeneratedSpec) => void;
}

export function ConversationalIntakeContent({
  onSwitchToEditor,
  sharedState,
  onStateChange,
  onSpecGenerated,
}: ConversationalIntakeContentProps) {
  // ═══════ Hooks — state ═══════
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(
    sharedState?.selectedTemplate ?? null,
  );
  const [aiFailure, setAiFailure] = useState(false);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);

  // ═══════ Hooks — context ═══════
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();

  // ═══════ Hooks — mutations ═══════
  const generateSpec = useGenerateChallengeSpec();
  const createChallenge = useSubmitSolutionRequest();
  const saveStep = useSaveChallengeStep();

  // ═══════ Hooks — form ═══════
  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      problem_statement: sharedState?.problemStatement ?? '',
      expected_outcomes: '',
      maturity_level: (sharedState?.maturityLevel as IntakeFormValues['maturity_level']) || undefined,
      prize_amount: undefined,
      currency_code: 'USD',
      deadline: undefined,
    },
  });

  const watchedMaturity = form.watch('maturity_level');
  const watchedProblem = form.watch('problem_statement');

  // ═══════ Hooks — effects ═══════

  useEffect(() => {
    if (onStateChange && watchedProblem !== sharedState?.problemStatement) {
      onStateChange({ problemStatement: watchedProblem });
    }
  }, [watchedProblem]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (onStateChange && watchedMaturity && watchedMaturity !== sharedState?.maturityLevel) {
      onStateChange({ maturityLevel: watchedMaturity });
    }
  }, [watchedMaturity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sharedState) return;
    const currentProblem = form.getValues('problem_statement');
    if (sharedState.problemStatement && sharedState.problemStatement !== currentProblem) {
      form.setValue('problem_statement', sharedState.problemStatement);
    }
    if (sharedState.maturityLevel && sharedState.maturityLevel !== form.getValues('maturity_level')) {
      form.setValue('maturity_level', sharedState.maturityLevel as IntakeFormValues['maturity_level']);
    }
    if (sharedState.selectedTemplate && sharedState.selectedTemplate.id !== selectedTemplate?.id) {
      setSelectedTemplate(sharedState.selectedTemplate);
    }
  }, [sharedState?.problemStatement, sharedState?.maturityLevel, sharedState?.selectedTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════ Conditional returns (after all hooks) ═══════
  if (orgLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // ═══════ Handlers ═══════

  const handleTemplateSelect = (template: ChallengeTemplate) => {
    setSelectedTemplate(template);
    onStateChange?.({ selectedTemplate: template });
    if (template.prefill.problem_statement !== undefined) {
      form.setValue('problem_statement', template.prefill.problem_statement);
    }
    if (template.prefill.maturity_level) {
      form.setValue('maturity_level', template.prefill.maturity_level as IntakeFormValues['maturity_level']);
    }
  };

  const handleAddFiles = (fileList: FileList) => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    const newFiles = Array.from(fileList).filter((f) => {
      if (f.size > MAX_SIZE) {
        toast.error(`"${f.name}" exceeds 10 MB limit`);
        return false;
      }
      return true;
    });
    setSupportingFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (idx: number) => {
    setSupportingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const isGenerating = generateSpec.isPending || createChallenge.isPending;

  const handleGoToEditor = (data?: IntakeFormValues) => {
    if (onSwitchToEditor) {
      onSwitchToEditor();
    } else {
      const params = new URLSearchParams();
      if (data?.problem_statement) params.set('problem', data.problem_statement);
      if (data?.maturity_level) params.set('maturity', data.maturity_level);
      if (selectedTemplate?.id) params.set('template', selectedTemplate.id);
      navigate(`/cogni/challenges/new?${params.toString()}`);
    }
  };

  const handleGenerateWithAI = async (data: IntakeFormValues) => {
    setAiFailure(false);

    if (!currentOrg || !user?.id) {
      console.warn('[ConversationalIntake] Generate blocked — org missing', {
        userId: user?.id ?? 'none',
        email: user?.email ?? 'none',
        orgNull: !currentOrg,
      });
      toast.error(
        'Your account is not linked to an organization. Please go to Demo Login, seed the scenario, and log in with a seeded role.',
        { duration: 8000 },
      );
      return;
    }

    // Step 1: AI spec generation
    let spec;
    try {
      spec = await generateSpec.mutateAsync({
        problem_statement: data.problem_statement,
        maturity_level: data.maturity_level,
        template_id: selectedTemplate?.id,
      });
    } catch {
      setAiFailure(true);
      return;
    }

    // Step 2: Challenge creation + save (DB operations — NOT an AI failure)
    try {
      const { challengeId } = await createChallenge.mutateAsync({
        orgId: currentOrg.organizationId,
        creatorId: user.id,
        operatingModel: 'AGG',
        businessProblem: spec.problem_statement,
        expectedOutcomes: data.expected_outcomes,
        currency: data.currency_code,
        budgetMin: data.prize_amount,
        budgetMax: data.prize_amount,
        expectedTimeline: data.deadline ? format(data.deadline, 'yyyy-MM-dd') : '',
        domainTags: selectedTemplate?.prefill.domain_tags ?? [],
        urgency: 'normal',
      });

      await saveStep.mutateAsync({
        challengeId,
        fields: {
          title: spec.title,
          problem_statement: spec.problem_statement,
          scope: spec.scope,
          description: spec.description,
          deliverables: Array.isArray(spec.deliverables) ? spec.deliverables : [],
          evaluation_criteria: Array.isArray(spec.evaluation_criteria) ? spec.evaluation_criteria : [],
          eligibility: spec.eligibility,
          hook: spec.hook,
          ip_model: spec.ip_model,
          maturity_level: data.maturity_level?.toUpperCase() ?? null,
          currency_code: data.currency_code,
          submission_deadline: data.deadline ? data.deadline.toISOString() : null,
          challenge_visibility: spec.challenge_visibility ?? 'public',
          solver_eligibility_types: Array.isArray(spec.solver_eligibility_details)
            ? spec.solver_eligibility_details.map((d: any) => ({ code: d.code, label: d.label }))
            : [],
          solver_visibility_types: Array.isArray(spec.solver_visibility_details)
            ? spec.solver_visibility_details.map((d: any) => ({ code: d.code, label: d.label }))
            : [],
        },
      });

      // Store spec in shared state if embedded
      if (onStateChange) {
        onStateChange({ generatedSpec: spec });
      }

      // Route based on governance mode
      const govMode = resolveGovernanceMode(currentOrg.governanceProfile);
      const route = getPostGenerationRoute(challengeId, govMode);

      if (govMode === 'CONTROLLED') {
        toast.success('AI suggestions ready — complete each field manually in Controlled mode.');
      } else if (govMode === 'STRUCTURED') {
        toast.success('AI specification generated! Review each section before submitting.');
      } else {
        toast.success('AI specification generated! Confirm to submit.');
      }
      navigate(route);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to create challenge: ${message}`, { duration: 8000 });
    }
  };

  // ═══════ Derived governance state ═══════
  const govMode = resolveGovernanceMode(currentOrg?.governanceProfile);
  const isControlled = shouldRequireAdvancedEditor(govMode);

  // ═══════ Render ═══════
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              Create a Challenge
            </h1>
            {!onSwitchToEditor && (
              <GovernanceProfileBadge profile={currentOrg?.governanceProfile} compact />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Describe your problem, set your parameters, and let AI draft the full specification.
          </p>
        </div>
        {!onSwitchToEditor && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGoToEditor()}
            className="shrink-0"
          >
            <Settings2 className="h-4 w-4 mr-1.5" />
            Advanced Editor
          </Button>
        )}
      </div>

      {/* Controlled mode notice */}
      {isControlled && (
        <Alert className="border-purple-300 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-700">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          <AlertTitle className="text-purple-800 dark:text-purple-300">Controlled Governance</AlertTitle>
          <AlertDescription className="text-purple-700 dark:text-purple-400">
            AI will suggest content in a side panel. You must manually write or explicitly apply each field.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Failure Fallback Banner */}
      {aiFailure && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-300">AI generation unavailable</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            AI couldn't generate the specification right now. You can continue manually — your inputs will be carried over.
          </AlertDescription>
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950"
              onClick={() => handleGoToEditor(form.getValues())}
            >
              <ArrowRight className="h-4 w-4 mr-1.5" />
              Continue in Advanced Editor
            </Button>
          </div>
        </Alert>
      )}

      {/* Step 1: Template Selector */}
      <TemplateSelector
        onSelect={handleTemplateSelect}
        selectedId={selectedTemplate?.id}
      />

      {/* Step 2: Problem Statement */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">
          Describe your challenge
          <span className="text-destructive ml-1">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          What problem are you trying to solve? Be as specific as possible — AI will help fill in the rest.
        </p>
        <Textarea
          placeholder="e.g., We need a machine learning model that can predict equipment failures 48 hours in advance using sensor data from our manufacturing line..."
          rows={6}
          className="text-base resize-none"
          {...form.register('problem_statement')}
        />
        {form.formState.errors.problem_statement && (
          <p className="text-xs text-destructive">
            {form.formState.errors.problem_statement.message}
          </p>
        )}
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">
            {(form.watch('problem_statement') ?? '').length} / 5,000
          </span>
        </div>
      </div>

      {/* Step 3: Expected Outcomes */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">
          Expected Outcomes
          <span className="text-destructive ml-1">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          What does success look like? What deliverables or results do you expect from solvers?
        </p>
        <Textarea
          placeholder="e.g., A working ML model with at least 85% accuracy, documentation on the approach, and a deployment guide..."
          rows={4}
          className="text-base resize-none"
          {...form.register('expected_outcomes')}
        />
        {form.formState.errors.expected_outcomes && (
          <p className="text-xs text-destructive">
            {form.formState.errors.expected_outcomes.message}
          </p>
        )}
      </div>

      {/* Step 4: Maturity Level */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground">
          What do you need back?
          <span className="text-destructive ml-1">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MATURITY_KEYS.map((level) => (
            <MaturityCard
              key={level}
              level={level}
              selected={watchedMaturity === level}
              onSelect={() => form.setValue('maturity_level', level, { shouldValidate: true })}
            />
          ))}
        </div>
        {form.formState.errors.maturity_level && (
          <p className="text-xs text-destructive">
            {form.formState.errors.maturity_level.message}
          </p>
        )}
      </div>

      {/* Step 5: Prize Amount + Currency */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">
          Prize Amount
          <span className="text-destructive ml-1">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Total reward for the winning solution(s).
        </p>
        <div className="flex gap-3">
          <Select
            value={form.watch('currency_code')}
            onValueChange={(v) => form.setValue('currency_code', v, { shouldValidate: true })}
          >
            <SelectTrigger className="w-32 shrink-0">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="10,000"
            className="flex-1"
            {...form.register('prize_amount', { valueAsNumber: true })}
          />
        </div>
        {form.formState.errors.prize_amount && (
          <p className="text-xs text-destructive">
            {form.formState.errors.prize_amount.message}
          </p>
        )}
        {form.formState.errors.currency_code && (
          <p className="text-xs text-destructive">
            {form.formState.errors.currency_code.message}
          </p>
        )}
      </div>

      {/* Step 6: Deadline */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">
          Submission Deadline
          <span className="text-destructive ml-1">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Must be at least {MIN_DEADLINE_DAYS} days from today.
        </p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`w-full max-w-xs justify-start text-left font-normal ${!form.watch('deadline') ? 'text-muted-foreground' : ''}`}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {form.watch('deadline')
                ? format(form.watch('deadline'), 'PPP')
                : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.watch('deadline')}
              onSelect={(d) => d && form.setValue('deadline', d, { shouldValidate: true })}
              disabled={(d) => d < addDays(new Date(), MIN_DEADLINE_DAYS)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.deadline && (
          <p className="text-xs text-destructive">
            {form.formState.errors.deadline.message}
          </p>
        )}
      </div>

      {/* Step 7: Supporting Files */}
      <FileUploadArea
        files={supportingFiles}
        onAdd={handleAddFiles}
        onRemove={handleRemoveFile}
      />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <Button
          onClick={form.handleSubmit(handleGenerateWithAI)}
          disabled={isGenerating}
          className="flex-1 sm:flex-none"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate with AI
            </>
          )}
        </Button>

        <Button
          variant="outline"
          onClick={form.handleSubmit((data) => handleGoToEditor(data))}
          size="lg"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Continue manually
        </Button>
      </div>

      {/* Info badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          AI-Assisted
        </Badge>
        <span>
          AI will draft scope, deliverables, evaluation criteria, and more based on your inputs.
        </span>
      </div>
    </div>
  );
}

/* ─── Default Export (standalone page — backward compat) ──── */

export default function ConversationalIntakePage() {
  return <ConversationalIntakeContent />;
}
