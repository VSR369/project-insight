/**
 * ConversationalIntakePage — Simplified "front door" for challenge creation.
 * Presents: Template Selector → Problem text area → Maturity cards → "Generate with AI" button.
 * Route: /cogni/challenges/create
 *
 * Governance-aware: shows org governance mode badge and routes
 * post-generation based on QUICK/STRUCTURED/CONTROLLED mode.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Sparkles,
  ArrowRight,
  Wand2,
  Settings2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useSubmitSolutionRequest } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useSaveChallengeStep } from '@/hooks/queries/useChallengeForm';
import { useGenerateChallengeSpec } from '@/hooks/mutations/useGenerateChallengeSpec';
import { TemplateSelector } from '@/components/cogniblend/TemplateSelector';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { getPostGenerationRoute, shouldRequireAdvancedEditor, shouldSuggestAdvancedEditor } from '@/lib/challengeNavigation';
import { MATURITY_LABELS, MATURITY_DESCRIPTIONS } from '@/lib/maturityLabels';
import type { ChallengeTemplate } from '@/lib/challengeTemplates';

/* ─── Schema ──────────────────────────────────────────── */

const intakeSchema = z.object({
  problem_statement: z
    .string()
    .trim()
    .min(20, 'Describe the challenge in at least 20 characters')
    .max(5000, 'Keep the description under 5,000 characters'),
  maturity_level: z.enum(['blueprint', 'poc', 'prototype', 'pilot'], {
    required_error: 'Select a maturity level',
  }),
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

/* ─── Main Component ──────────────────────────────────── */

export default function ConversationalIntakePage() {
  // ═══════ Hooks — state ═══════
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null);
  const [aiFailure, setAiFailure] = useState(false);

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
      problem_statement: '',
      maturity_level: undefined,
    },
  });

  const watchedMaturity = form.watch('maturity_level');

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
    // Pre-fill form from template
    if (template.prefill.problem_statement !== undefined) {
      form.setValue('problem_statement', template.prefill.problem_statement);
    }
    if (template.prefill.maturity_level) {
      form.setValue('maturity_level', template.prefill.maturity_level as IntakeFormValues['maturity_level']);
    }
  };

  const isGenerating = generateSpec.isPending || createChallenge.isPending;

  const handleGenerateWithAI = async (data: IntakeFormValues) => {
    setAiFailure(false);

    // Fail early if org/user context is missing
    if (!currentOrg || !user?.id) {
      toast.error('Organization not found. Please ensure your demo scenario is seeded or log in again.');
      return;
    }

    try {
      const spec = await generateSpec.mutateAsync({
        problem_statement: data.problem_statement,
        maturity_level: data.maturity_level,
        template_id: selectedTemplate?.id,
      });

      // Create challenge with AI-generated spec
      const { challengeId } = await createChallenge.mutateAsync({
        orgId: currentOrg.organizationId,
        creatorId: user.id,
        operatingModel: 'AGG',
        businessProblem: spec.problem_statement,
        expectedOutcomes: spec.scope,
        currency: 'USD',
        budgetMin: 0,
        budgetMax: 0,
        expectedTimeline: '',
        domainTags: selectedTemplate?.prefill.domain_tags ?? [],
        urgency: 'normal',
      });

      // Save AI-generated fields
      await saveStep.mutateAsync({
        challengeId,
        fields: {
          title: spec.title,
          problem_statement: spec.problem_statement,
          scope: spec.scope,
          description: spec.description,
          deliverables: { items: spec.deliverables },
          evaluation_criteria: { criteria: spec.evaluation_criteria },
          eligibility: spec.eligibility,
          hook: spec.hook,
          ip_model: spec.ip_model,
          maturity_level: data.maturity_level,
        },
      });

      const govMode = resolveGovernanceMode(currentOrg.governanceProfile);
      const route = getPostGenerationRoute(challengeId, govMode);

      if (shouldRequireAdvancedEditor(govMode)) {
        toast.success('AI draft generated — all fields require manual verification in Controlled mode.');
      } else if (shouldSuggestAdvancedEditor(govMode)) {
        toast.success('AI specification generated! Consider refining in the Advanced Editor.');
      } else {
        toast.success('AI specification generated!');
      }
      navigate(route);
    } catch {
      // Show amber fallback banner — user can continue manually
      setAiFailure(true);
    }
  };

  const handleAdvancedEditor = () => {
    navigate('/cogni/challenges/new');
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
            <GovernanceProfileBadge profile={currentOrg?.governanceProfile} compact />
          </div>
          <p className="text-sm text-muted-foreground">
            Describe your problem, pick a maturity level, and let AI help draft the specification.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdvancedEditor}
          className="shrink-0"
        >
          <Settings2 className="h-4 w-4 mr-1.5" />
          Advanced Editor
        </Button>
      </div>

      {/* Controlled mode notice */}
      {isControlled && (
        <Alert className="border-purple-300 bg-purple-50 dark:bg-purple-950/20 dark:border-purple-700">
          <ShieldCheck className="h-4 w-4 text-purple-600" />
          <AlertTitle className="text-purple-800 dark:text-purple-300">Controlled Governance</AlertTitle>
          <AlertDescription className="text-purple-700 dark:text-purple-400">
            All AI-generated fields must be manually verified in the Advanced Editor before submission.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Failure Fallback Banner (V-5) */}
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
              onClick={() => {
                const values = form.getValues();
                const params = new URLSearchParams();
                if (values.problem_statement) params.set('problem', values.problem_statement);
                if (values.maturity_level) params.set('maturity', values.maturity_level);
                if (selectedTemplate?.id) params.set('template', selectedTemplate.id);
                navigate(`/cogni/challenges/new?${params.toString()}`);
              }}
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

      {/* Step 3: Maturity Level */}
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
          onClick={form.handleSubmit((data) => {
            const params = new URLSearchParams({
              problem: data.problem_statement,
              maturity: data.maturity_level,
            });
            navigate(`/cogni/challenges/new?${params.toString()}`);
          })}
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
          AI will draft scope, deliverables, evaluation criteria, and timeline based on your description.
        </span>
      </div>
    </div>
  );
}
