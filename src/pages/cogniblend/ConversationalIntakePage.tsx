/**
 * ConversationalIntakePage — Simplified "front door" for challenge creation.
 * Presents: Template → Problem → Expand Challenge Details → Expected Outcomes → Maturity → Prize → Deadline → Files → "Generate with AI".
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
import { useFormPersistence } from '@/hooks/useFormPersistence';
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
  ChevronDown,
  Zap,
  Info,
  Check,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { useSaveChallengeStep, useChallengeDetail } from '@/hooks/queries/useChallengeForm';
import { useGenerateChallengeSpec, type GeneratedSpec } from '@/hooks/mutations/useGenerateChallengeSpec';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { TemplateSelector } from '@/components/cogniblend/TemplateSelector';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { cn } from '@/lib/utils';
import {
  resolveGovernanceMode,
  getAvailableGovernanceModes,
  getDefaultGovernanceMode,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';
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

/* ─── Known extended_brief keys ────────────────────────── */

const KNOWN_BRIEF_KEYS = new Set([
  'context_background', 'root_causes', 'affected_stakeholders',
  'scope_definition', 'preferred_approach', 'approaches_not_of_interest',
  'beneficiaries_mapping', 'solution_expectations', 'am_approval_required',
]);

/** Convert snake_case key to human-readable label */
function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TIMELINE_OPTIONS = [
  { value: '1-3', label: '1–3 months' },
  { value: '3-6', label: '3–6 months' },
  { value: '6-12', label: '6–12 months' },
  { value: '12+', label: '12+ months' },
];

/* ─── Schema ──────────────────────────────────────────── */

const intakeSchema = z.object({
  title: z.string().trim().max(200, 'Title must be 200 characters or less').optional().default(''),
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
  budget_min: z.coerce.number().min(0).optional(),
  currency_code: z.string().min(1, 'Select a currency').default('USD'),
  deadline: z.date({
    required_error: 'Select a submission deadline',
  }).refine(
    (d) => d >= addDays(new Date(), MIN_DEADLINE_DAYS),
    `Deadline must be at least ${MIN_DEADLINE_DAYS} days from today`,
  ),
  expected_timeline: z.string().optional().default(''),
  // Expand Challenge Details — optional domain-expert fields
  context_background: z.string().max(2000, 'Keep under 2,000 characters').optional().default(''),
  root_causes: z.string().max(1000, 'Keep under 1,000 characters').optional().default(''),
  affected_stakeholders: z.string().max(1000, 'Keep under 1,000 characters').optional().default(''),
  scope_definition: z.string().max(2000, 'Keep under 2,000 characters').optional().default(''),
  preferred_approach: z.string().max(1000, 'Keep under 1,000 characters').optional().default(''),
  approaches_not_of_interest: z.string().max(1000, 'Keep under 1,000 characters').optional().default(''),
  beneficiaries_mapping: z.string().max(2000, 'Keep under 2,000 characters').optional().default(''),
  solution_expectations: z.string().max(2000, 'Keep under 2,000 characters').optional().default(''),
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

/* ─── Expand Challenge Detail Field ───────────────────── */

function ExpandField({
  label,
  fieldName,
  placeholder,
  maxLength,
  rows = 3,
  register,
  watchValue,
}: {
  label: string;
  fieldName: string;
  placeholder: string;
  maxLength: number;
  rows?: number;
  register: any;
  watchValue: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Textarea
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="text-base resize-none"
        {...register(fieldName)}
      />
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">
          {(watchValue ?? '').length} / {maxLength.toLocaleString()}
        </span>
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
  /** Governance mode from parent landing page */
  governanceMode?: GovernanceMode;
  /** Engagement model from parent landing page */
  engagementModel?: string;
  /** When provided, form loads existing challenge data for editing */
  challengeId?: string;
  /** 'create' (default) or 'edit' */
  mode?: 'create' | 'edit';
}

export function ConversationalIntakeContent({
  onSwitchToEditor,
  sharedState,
  onStateChange,
  onSpecGenerated,
  governanceMode: propGovernanceMode,
  engagementModel: propEngagementModel,
  challengeId: editChallengeId,
  mode = 'create',
}: ConversationalIntakeContentProps) {
  // ═══════ Hooks — state ═══════
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(
    sharedState?.selectedTemplate ?? null,
  );
  const [aiFailure, setAiFailure] = useState(false);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [expandOpen, setExpandOpen] = useState(false);
  const [localGovernanceMode, setLocalGovernanceMode] = useState<GovernanceMode>('QUICK');
  const [localEngagementModel, setLocalEngagementModel] = useState<string>('MP');

  // Use props if provided (from landing page), otherwise fall back to local state
  const governanceMode = propGovernanceMode ?? localGovernanceMode;
  const engagementModel = propEngagementModel ?? localEngagementModel;

  // ═══════ Hooks — context ═══════
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();

  // ═══════ Hooks — mutations ═══════
  const generateSpec = useGenerateChallengeSpec();
  const createChallenge = useSubmitSolutionRequest();
  const saveStep = useSaveChallengeStep();

  // ═══════ Hooks — edit mode query ═══════
  const { data: editChallenge, isLoading: editLoading } = useChallengeDetail(
    mode === 'edit' ? editChallengeId : undefined,
  );
  const isEditMode = mode === 'edit';

  // ═══════ Hooks — industry segments ═══════
  const { data: industrySegments = [] } = useIndustrySegments();
  const [selectedIndustrySegmentId, setSelectedIndustrySegmentId] = useState<string>('');

  // ═══════ Hooks — dynamic extended_brief keys (AM extras) ═══════
  const [dynamicBriefFields, setDynamicBriefFields] = useState<Record<string, string>>({});

  // ═══════ Hooks — form ═══════
  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      title: '',
      problem_statement: sharedState?.problemStatement ?? '',
      expected_outcomes: '',
      maturity_level: (sharedState?.maturityLevel as IntakeFormValues['maturity_level']) || undefined,
      prize_amount: undefined,
      budget_min: undefined,
      currency_code: 'USD',
      deadline: undefined,
      expected_timeline: '',
      context_background: '',
      root_causes: '',
      affected_stakeholders: '',
      scope_definition: '',
      preferred_approach: '',
      approaches_not_of_interest: '',
      beneficiaries_mapping: '',
      solution_expectations: '',
    },
  });

  const { clearPersistedData } = useFormPersistence('cogni_intake_conversational', form);
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

  // Sync governance mode & engagement model from org defaults once loaded (only when no props)
  useEffect(() => {
    if (currentOrg && !propGovernanceMode) {
      setLocalGovernanceMode(getDefaultGovernanceMode(currentOrg.tierCode, currentOrg.governanceProfile));
    }
  }, [currentOrg?.governanceProfile, currentOrg?.tierCode, propGovernanceMode]);

  // ═══════ Hooks — edit mode pre-fill ═══════
  const [editPrefilled, setEditPrefilled] = useState(false);

  useEffect(() => {
    if (!isEditMode || !editChallenge || editPrefilled) return;

    // Pre-fill form fields from existing challenge
    const ch = editChallenge as unknown as Record<string, unknown>;

    if (ch.problem_statement) {
      form.setValue('problem_statement', ch.problem_statement as string);
    }
    if (ch.scope) {
      form.setValue('expected_outcomes', ch.scope as string);
    }
    if (ch.maturity_level) {
      const ml = (ch.maturity_level as string).toLowerCase();
      if (['blueprint', 'poc', 'prototype', 'pilot'].includes(ml)) {
        form.setValue('maturity_level', ml as IntakeFormValues['maturity_level']);
      }
    }
    // Prize / currency from reward_structure or direct fields
    const rewardStructure = ch.reward_structure as Record<string, unknown> | null;
    if (rewardStructure?.budget_max) {
      form.setValue('prize_amount', Number(rewardStructure.budget_max));
    }
    if (rewardStructure?.currency) {
      form.setValue('currency_code', rewardStructure.currency as string);
    } else if (ch.currency_code) {
      form.setValue('currency_code', ch.currency_code as string);
    }
    // Deadline
    if (ch.submission_deadline) {
      form.setValue('deadline', new Date(ch.submission_deadline as string));
    }
    // Extended brief fields
    const eb = ch.extended_brief as Record<string, string> | null;
    if (eb) {
      if (eb.context_background) form.setValue('context_background', eb.context_background);
      if (eb.root_causes) form.setValue('root_causes', eb.root_causes);
      if (eb.affected_stakeholders) form.setValue('affected_stakeholders', eb.affected_stakeholders);
      if (eb.scope_definition) form.setValue('scope_definition', eb.scope_definition);
      if (eb.preferred_approach) form.setValue('preferred_approach', eb.preferred_approach);
      if (eb.approaches_not_of_interest) form.setValue('approaches_not_of_interest', eb.approaches_not_of_interest);
      // Auto-expand if any detail fields have content
      const hasExpanded = Object.values(eb).some((v) => v?.trim());
      if (hasExpanded) setExpandOpen(true);
    }
    // Governance mode from challenge
    if (ch.governance_profile && !propGovernanceMode) {
      const mode = resolveGovernanceMode(ch.governance_profile as string);
      setLocalGovernanceMode(mode);
    }
    // Engagement model from challenge
    if (ch.operating_model && !propEngagementModel) {
      setLocalEngagementModel(ch.operating_model as string);
    }

    setEditPrefilled(true);
  }, [isEditMode, editChallenge, editPrefilled]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════ Conditional returns (after all hooks) ═══════
  if (orgLoading || (isEditMode && editLoading)) {
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

  /** Edit mode: save updated fields directly without AI generation */
  const handleUpdateChallenge = async (data: IntakeFormValues) => {
    if (!editChallengeId) return;

    try {
      const extendedBrief: Record<string, string> = {};
      if (data.context_background?.trim()) extendedBrief.context_background = data.context_background.trim();
      if (data.root_causes?.trim()) extendedBrief.root_causes = data.root_causes.trim();
      if (data.affected_stakeholders?.trim()) extendedBrief.affected_stakeholders = data.affected_stakeholders.trim();
      if (data.scope_definition?.trim()) extendedBrief.scope_definition = data.scope_definition.trim();
      if (data.preferred_approach?.trim()) extendedBrief.preferred_approach = data.preferred_approach.trim();
      if (data.approaches_not_of_interest?.trim()) extendedBrief.approaches_not_of_interest = data.approaches_not_of_interest.trim();

      await saveStep.mutateAsync({
        challengeId: editChallengeId,
        fields: {
          problem_statement: data.problem_statement,
          scope: data.expected_outcomes,
          maturity_level: data.maturity_level?.toUpperCase() ?? null,
          currency_code: data.currency_code,
          submission_deadline: data.deadline ? data.deadline.toISOString() : null,
          governance_profile: governanceMode,
          operating_model: engagementModel,
          ...(Object.keys(extendedBrief).length > 0 ? { extended_brief: extendedBrief } : {}),
        },
      });

      toast.success('Challenge updated successfully');
      navigate(`/cogni/challenges/${editChallengeId}/spec`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to update challenge: ${message}`, { duration: 8000 });
    }
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

  /** Build enriched context string from expand fields for AI generation */
  const buildExpandedContext = (data: IntakeFormValues): string => {
    const parts: string[] = [];
    if (data.context_background?.trim()) parts.push(`Context & Background: ${data.context_background.trim()}`);
    if (data.root_causes?.trim()) parts.push(`Root Causes: ${data.root_causes.trim()}`);
    if (data.affected_stakeholders?.trim()) parts.push(`Affected Stakeholders: ${data.affected_stakeholders.trim()}`);
    if (data.scope_definition?.trim()) parts.push(`Scope: ${data.scope_definition.trim()}`);
    if (data.preferred_approach?.trim()) parts.push(`Preferred Approach: ${data.preferred_approach.trim()}`);
    if (data.approaches_not_of_interest?.trim()) parts.push(`Approaches NOT of Interest: ${data.approaches_not_of_interest.trim()}`);
    return parts.join('\n\n');
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

    // Build enriched problem statement with expanded context
    const expandedContext = buildExpandedContext(data);
    const enrichedProblem = expandedContext
      ? `${data.problem_statement}\n\n--- Domain Expert Context ---\n${expandedContext}`
      : data.problem_statement;

    // Step 1: AI spec generation
    let spec;
    try {
      spec = await generateSpec.mutateAsync({
        problem_statement: enrichedProblem,
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
        operatingModel: engagementModel === 'AGG' ? 'AGG' : 'MP',
        businessProblem: spec.problem_statement,
        expectedOutcomes: data.expected_outcomes,
        currency: data.currency_code,
        budgetMin: data.prize_amount,
        budgetMax: data.prize_amount,
        expectedTimeline: data.deadline ? format(data.deadline, 'yyyy-MM-dd') : '',
        domainTags: selectedTemplate?.prefill.domain_tags ?? [],
        urgency: 'normal',
      });

      // Build extended_brief from expand fields
      const extendedBrief: Record<string, string> = {};
      if (data.context_background?.trim()) extendedBrief.context_background = data.context_background.trim();
      if (data.root_causes?.trim()) extendedBrief.root_causes = data.root_causes.trim();
      if (data.affected_stakeholders?.trim()) extendedBrief.affected_stakeholders = data.affected_stakeholders.trim();
      if (data.scope_definition?.trim()) extendedBrief.scope_definition = data.scope_definition.trim();
      if (data.preferred_approach?.trim()) extendedBrief.preferred_approach = data.preferred_approach.trim();
      if (data.approaches_not_of_interest?.trim()) extendedBrief.approaches_not_of_interest = data.approaches_not_of_interest.trim();

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
          governance_profile: governanceMode,
          operating_model: engagementModel,
          // Persist domain-expert context in extended_brief JSONB
          ...(Object.keys(extendedBrief).length > 0 ? { extended_brief: extendedBrief } : {}),
          solver_eligibility_types: (() => {
            const details = Array.isArray(spec.solver_eligibility_details)
              ? spec.solver_eligibility_details.map((d: any) => ({ code: d.code, label: d.label }))
              : [];
            if (details.length === 0) {
              const assignment = computeSolverAssignment({
                maturityLevel: data.maturity_level,
                ipModel: spec.ip_model,
              });
              return [{ code: assignment.eligibleCode, label: assignment.eligibleCode }];
            }
            return details;
          })(),
          solver_visibility_types: (() => {
            const details = Array.isArray(spec.solver_visibility_details)
              ? spec.solver_visibility_details.map((d: any) => ({ code: d.code, label: d.label }))
              : [];
            if (details.length === 0) {
              const assignment = computeSolverAssignment({
                maturityLevel: data.maturity_level,
                ipModel: spec.ip_model,
              });
              return [{ code: assignment.visibleCode, label: assignment.visibleCode }];
            }
            return details;
          })(),
        },
      });

      // Store spec in shared state if embedded
      if (onStateChange) {
        onStateChange({ generatedSpec: spec });
      }

      // Route based on selected governance mode (per-challenge)
      const route = getPostGenerationRoute(challengeId, governanceMode);

      if (governanceMode === 'CONTROLLED') {
        toast.success('AI suggestions ready — complete each field manually in Controlled mode.');
      } else if (governanceMode === 'STRUCTURED') {
        toast.success('AI specification generated! Review each section before submitting.');
      } else {
        toast.success('AI specification generated! Confirm to submit.');
      }
      clearPersistedData();
      navigate(route);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to create challenge: ${message}`, { duration: 8000 });
    }
  };

  // ═══════ Derived governance state ═══════
  const availableModes = getAvailableGovernanceModes(currentOrg?.tierCode);
  const disabledModes: GovernanceMode[] = (['QUICK', 'STRUCTURED', 'CONTROLLED'] as GovernanceMode[]).filter(
    (m) => !availableModes.includes(m),
  );
  const isControlled = shouldRequireAdvancedEditor(governanceMode);

  // ═══════ Render ═══════
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {isEditMode ? 'Edit Challenge' : 'Create a Challenge'}
            </h1>
            {!onSwitchToEditor && (
              <GovernanceProfileBadge profile={currentOrg?.governanceProfile} compact />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            As a domain expert, provide the context solvers need. AI will draft the full specification from your inputs.
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

      {/* ═══ Governance Mode Selection ═══ */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Governance Mode</h3>
          <p className="text-sm text-muted-foreground">
            Choose how much structure and compliance this challenge requires.
            {currentOrg?.tierCode && (
              <span className="ml-1 text-xs text-muted-foreground">
                (Your tier: <span className="font-medium capitalize">{currentOrg.tierCode}</span>)
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {([
            { mode: 'QUICK' as GovernanceMode, icon: Zap, features: ['Simplified workflow with fewer required fields', 'Auto-completion & merged roles', 'Auto-attached legal defaults', 'Ideal for fast experiments & small challenges'] },
            { mode: 'STRUCTURED' as GovernanceMode, icon: Settings2, features: ['Full field set with manual curation', 'Optional add-ons (escrow, targeting)', 'Distinct creator & curator roles', 'Best for standard enterprise challenges'] },
            { mode: 'CONTROLLED' as GovernanceMode, icon: ShieldCheck, features: ['Mandatory escrow & formal gates', 'All legal documents required', 'Strict role separation enforced', 'Full compliance & audit trail'] },
          ]).map(({ mode, icon: Icon, features }) => {
            const cfg = GOVERNANCE_MODE_CONFIG[mode];
            const isSelected = governanceMode === mode;
            const isDisabled = disabledModes.includes(mode);

            return (
              <button
                key={mode}
                type="button"
                disabled={isDisabled}
                onClick={() => { if (!isDisabled) setLocalGovernanceMode(mode); }}
                className={cn(
                  'relative w-full text-left rounded-xl border-2 p-5 transition-all',
                  isSelected ? 'shadow-md ring-1' : 'hover:shadow-sm',
                  isDisabled && 'opacity-40 cursor-not-allowed',
                )}
                style={{
                  borderColor: isSelected ? cfg.color : 'hsl(var(--border))',
                  backgroundColor: isSelected ? cfg.bg : 'transparent',
                  ...(isSelected ? { boxShadow: `0 0 0 1px ${cfg.color}20` } : {}),
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                </div>
                <ul className="space-y-1.5">
                  {features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-0.5 shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: cfg.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {isSelected && (
                  <div
                    className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.color }}
                  >
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {isDisabled && (
                  <Badge variant="secondary" className="absolute top-2.5 right-2.5 text-[9px]">
                    Upgrade required
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══ Engagement Model Selection ═══ */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Engagement Model</h3>
          <p className="text-sm text-muted-foreground">
            Select the engagement model for this challenge. This determines how solvers are engaged and managed.
          </p>
        </div>

        <Select value={engagementModel} onValueChange={setLocalEngagementModel}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select engagement model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MP">Marketplace (MP) — Open competition</SelectItem>
            <SelectItem value="AGG">Aggregator (AGG) — Curated selection</SelectItem>
          </SelectContent>
        </Select>

        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5 max-w-sm">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {engagementModel === 'AGG'
              ? 'Aggregator model: solvers are curated and invited. An Account Manager (AM) role is not required.'
              : 'Marketplace model: solvers discover and apply. An Account Manager (AM) role manages the process.'}
          </p>
        </div>
      </div>

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

      {/* Expand Challenge Details — Domain Expert Fields */}
      <Collapsible open={expandOpen} onOpenChange={setExpandOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left group"
          >
            <ChevronDown className={`h-5 w-5 text-destructive transition-transform duration-200 ${expandOpen ? '' : '-rotate-90'}`} />
            <span className="text-lg font-bold text-destructive">Expand Challenge Details</span>
            <span className="text-sm text-destructive/70 font-normal">(optional — recommended)</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-5">
            <p className="text-xs text-muted-foreground">
              The more context you provide, the better the AI-generated specification will be.
            </p>

            <ExpandField
              label="Context & Background"
              fieldName="context_background"
              placeholder="Provide relevant history, industry context, or organizational background that solvers should understand…"
              maxLength={2000}
              rows={3}
              register={form.register}
              watchValue={form.watch('context_background') ?? ''}
            />

            <ExpandField
              label="Root Causes"
              fieldName="root_causes"
              placeholder="What are the underlying causes of this problem? Why hasn't it been solved yet?"
              maxLength={1000}
              rows={2}
              register={form.register}
              watchValue={form.watch('root_causes') ?? ''}
            />

            <ExpandField
              label="Affected Stakeholders"
              fieldName="affected_stakeholders"
              placeholder="Who is impacted by this problem and how? (e.g., end users, operations teams, customers)"
              maxLength={1000}
              rows={2}
              register={form.register}
              watchValue={form.watch('affected_stakeholders') ?? ''}
            />

            <ExpandField
              label="Scope Definition"
              fieldName="scope_definition"
              placeholder="What is explicitly in scope and out of scope for this challenge?"
              maxLength={2000}
              rows={3}
              register={form.register}
              watchValue={form.watch('scope_definition') ?? ''}
            />

            <ExpandField
              label="Preferred Approach"
              fieldName="preferred_approach"
              placeholder="Any specific methodologies, technologies, or frameworks you'd prefer solvers to use?"
              maxLength={1000}
              rows={2}
              register={form.register}
              watchValue={form.watch('preferred_approach') ?? ''}
            />

            <ExpandField
              label="Approaches NOT of Interest"
              fieldName="approaches_not_of_interest"
              placeholder="What has been tried and failed? What approaches should solvers avoid?"
              maxLength={1000}
              rows={2}
              register={form.register}
              watchValue={form.watch('approaches_not_of_interest') ?? ''}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        {isEditMode ? (
          <>
            <Button
              onClick={form.handleSubmit(handleUpdateChallenge)}
              disabled={saveStep.isPending}
              className="flex-1 sm:flex-none"
              size="lg"
            >
              {saveStep.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Update Challenge
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/cogni/challenges/${editChallengeId}/spec`)}
              size="lg"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Spec Review
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
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
