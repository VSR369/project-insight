/**
 * ChallengeCreatorForm — 2-tab challenge creation form.
 * Tab 1 (Essential Details): mandatory fields (governance-aware).
 * Tab 2 (Additional Context): optional or required based on governance mode.
 *
 * Governance modes:
 *   QUICK: 5 fields required (title, problem_statement, maturity_level, domain_tags, budget for MP)
 *   STRUCTURED: 8 essential fields required (current default)
 *   CONTROLLED: 8 essential + 5 context fields required
 */

import { useState, useCallback, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Save, Loader2, FlaskConical } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useSubmitSolutionRequest, useSaveDraft, useUpdateDraft } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { supabase } from '@/integrations/supabase/client';
import type { GovernanceMode } from '@/lib/governanceMode';
import { useGovernanceFieldRules } from '@/hooks/queries/useGovernanceFieldRules';
import { filterSeedByGovernance } from '@/lib/cogniblend/governanceFieldFilter';

import { EssentialDetailsTab } from './EssentialDetailsTab';
import { AdditionalContextTab } from './AdditionalContextTab';
import { MP_SEED, AGG_SEED } from './creatorSeedContent';

const stakeholderRowSchema = z.object({
  stakeholder_name: z.string(),
  role: z.string(),
  impact_description: z.string(),
  adoption_challenge: z.string(),
});

function buildCreatorSchema(governanceMode: GovernanceMode, engagementModel: string) {
  const isQuick = governanceMode === 'QUICK';
  const isControlled = governanceMode === 'CONTROLLED';

  const problemMin = isQuick ? 100 : 200;
  const scopeRule = isQuick ? z.string().optional().default('') : z.string().min(100, 'At least 100 characters required');
  const ipRule = isQuick ? z.string().optional().default('IP-NEL') : z.string().min(1, 'Please select an IP model');
  const outcomesRule = z.array(z.string()).min(1, 'Add at least one expected outcome');
  const lineItemRule = isControlled ? z.array(z.string()).min(1, 'Required for Controlled governance') : z.array(z.string()).default(['']);
  const contextStringRule = isControlled ? z.string().min(1, 'Required for Controlled governance') : z.string().optional().default('');
  const stakeholderRule = isControlled ? z.array(stakeholderRowSchema).min(1, 'Required for Controlled governance') : z.array(stakeholderRowSchema).default([]);

  const base = z.object({
    title: z.string().trim().min(1, 'Title is required').max(100, 'Max 100 characters'),
    problem_statement: z.string().min(problemMin, `At least ${problemMin} characters required`),
    scope: scopeRule,
    maturity_level: z.string().min(1, 'Please select a solution type'),
    solution_maturity_id: z.string().optional().default(''),
    industry_segment_id: z.string().min(1, 'Please select a primary industry segment'),
    domain_tags: z.array(z.string()).min(1, 'Select at least 1 domain').max(3, 'Max 3 domains'),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
    budget_min: z.coerce.number().min(0).default(0),
    budget_max: z.coerce.number().min(0).default(0),
    ip_model: ipRule,
    expected_outcomes: outcomesRule,
    context_background: contextStringRule,
    preferred_approach: lineItemRule,
    approaches_not_of_interest: lineItemRule,
    affected_stakeholders: stakeholderRule,
    current_deficiencies: lineItemRule,
    root_causes: lineItemRule,
    expected_timeline: z.string().optional().default(''),
  });

  if (engagementModel === 'MP') {
    return base
      .refine((data) => data.budget_max > 0, {
        message: 'Maximum budget is required for Marketplace',
        path: ['budget_max'],
      })
      .refine((data) => data.budget_min < data.budget_max, {
        message: 'Min must be less than max',
        path: ['budget_min'],
      });
  }

  return base;
}

export type CreatorFormValues = {
  title: string;
  problem_statement: string;
  scope: string;
  maturity_level: string;
  solution_maturity_id: string;
  domain_tags: string[];
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  budget_min: number;
  budget_max: number;
  ip_model: string;
  expected_outcomes: string[];
  context_background: string;
  preferred_approach: string[];
  approaches_not_of_interest: string[];
  affected_stakeholders: Array<{
    stakeholder_name: string;
    role: string;
    impact_description: string;
    adoption_challenge: string;
  }>;
  current_deficiencies: string[];
  root_causes: string[];
  expected_timeline: string;
  industry_segment_id: string;
};

interface ChallengeCreatorFormProps {
  engagementModel: string;
  governanceMode: GovernanceMode;
}

function toFormMaturityCode(value: string | null | undefined): string {
  if (!value) return '';
  const upper = value.toUpperCase();
  if (upper.startsWith('SOLUTION_')) return upper;
  if (upper === 'PILOT') return upper;
  return `SOLUTION_${upper}`;
}

export function ChallengeCreatorForm({ engagementModel, governanceMode }: ChallengeCreatorFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();
  const { data: solutionMaturityOptions = [] } = useSolutionMaturityList();
  const { data: tierLimit } = useTierLimitCheck();
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();
  const updateDraftMutation = useUpdateDraft();

  const [showTierModal, setShowTierModal] = useState(false);
  const [activeTab, setActiveTab] = useState('essential');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [draftChallengeId, setDraftChallengeId] = useState<string | null>(searchParams.get('draft'));

  const schema = useMemo(() => buildCreatorSchema(governanceMode, engagementModel), [governanceMode, engagementModel]);

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      title: '',
      problem_statement: '',
      scope: '',
      maturity_level: '',
      solution_maturity_id: '',
      industry_segment_id: '',
      domain_tags: [],
      currency: 'USD',
      budget_min: 0,
      budget_max: 0,
      ip_model: governanceMode === 'QUICK' ? 'IP-NEL' : '',
      expected_outcomes: [''],
      context_background: '',
      preferred_approach: [''],
      approaches_not_of_interest: [''],
      affected_stakeholders: [],
      current_deficiencies: [''],
      root_causes: [''],
      expected_timeline: '',
    },
  });

  const currentMaturityLevel = form.watch('maturity_level');
  const currentSolutionMaturityId = form.watch('solution_maturity_id');

  const draftLoaded = useRef(false);
  useEffect(() => {
    if (!draftChallengeId || draftLoaded.current) return;
    draftLoaded.current = true;

    (async () => {
      const { data: challenge } = await supabase
        .from('challenges')
        .select('title, problem_statement, scope, maturity_level, solution_maturity_id, ip_model, domain_tags, currency_code, reward_structure, extended_brief, expected_outcomes, industry_segment_id, phase_schedule')
        .eq('id', draftChallengeId)
        .maybeSingle();

      if (!challenge) return;

      const rewardStructure = challenge.reward_structure as Record<string, unknown> | null;
      const extendedBrief = challenge.extended_brief as Record<string, unknown> | null;
      const expectedOutcomes = challenge.expected_outcomes as unknown;
      const phaseSchedule = challenge.phase_schedule as Record<string, unknown> | null;

      const parseLineItems = (value: unknown): string[] => {
        if (!value) return [''];

        // Try to parse string as JSON first (handles double-encoded JSONB)
        let parsed: unknown = value;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch { return [(value as string).trim() || ''].filter(Boolean).length > 0 ? [value as string] : ['']; }
        }

        // Handle { items: [{ name: "..." }] } structure
        if (typeof parsed === 'object' && parsed !== null && 'items' in parsed) {
          const items = (parsed as { items?: Array<{ name?: string } | string> }).items;
          if (Array.isArray(items)) {
            const result = items.map((item) => (typeof item === 'string' ? item : item?.name || '')).filter(Boolean);
            return result.length > 0 ? result : [''];
          }
        }

        // Handle plain array
        if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : [''];

        // Fallback
        if (typeof value === 'string' && value.trim()) return [value];
        return [''];
      };

      const parseStakeholders = (value: unknown): CreatorFormValues['affected_stakeholders'] => {
        if (!value) return [];
        if (Array.isArray(value)) return value as CreatorFormValues['affected_stakeholders'];
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? (parsed as CreatorFormValues['affected_stakeholders']) : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      form.reset({
        title: (challenge.title as string) || '',
        problem_statement: (challenge.problem_statement as string) || '',
        scope: (challenge.scope as string) || '',
        maturity_level: toFormMaturityCode(challenge.maturity_level as string | null | undefined),
        solution_maturity_id: (challenge.solution_maturity_id as string) || '',
        industry_segment_id: (challenge.industry_segment_id as string) || '',
        domain_tags: (challenge.domain_tags as string[]) || [],
        currency: ((rewardStructure?.currency as string) || 'USD') as CreatorFormValues['currency'],
        budget_min: Number(rewardStructure?.budget_min ?? 0),
        budget_max: Number(rewardStructure?.budget_max ?? 0),
        ip_model: (challenge.ip_model as string) || '',
        expected_outcomes: parseLineItems(expectedOutcomes),
        context_background: (extendedBrief?.context_background as string) || '',
        preferred_approach: parseLineItems(extendedBrief?.preferred_approach),
        approaches_not_of_interest: parseLineItems(extendedBrief?.approaches_not_of_interest),
        affected_stakeholders: parseStakeholders(extendedBrief?.affected_stakeholders),
        current_deficiencies: parseLineItems(extendedBrief?.current_deficiencies),
        root_causes: parseLineItems(extendedBrief?.root_causes),
        expected_timeline: (phaseSchedule?.expected_timeline as string) || '',
      });
    })();
  }, [draftChallengeId, form]);

  useEffect(() => {
    if (!solutionMaturityOptions.length || !currentMaturityLevel || currentSolutionMaturityId) return;

    const matched = solutionMaturityOptions.find(
      (option) => option.code === toFormMaturityCode(currentMaturityLevel),
    );

    if (!matched) return;

    if (currentMaturityLevel !== matched.code) {
      form.setValue('maturity_level', matched.code, { shouldDirty: false });
    }

    form.setValue('solution_maturity_id', matched.id, { shouldDirty: false });
  }, [currentMaturityLevel, currentSolutionMaturityId, form, solutionMaturityOptions]);

  const isSubmitting = submitMutation.isPending;
  const isSaving = draftMutation.isPending || updateDraftMutation.isPending;
  const isBusy = isSubmitting || isSaving;

  const cleanArray = (items: string[] | undefined): string[] => (items || []).filter((item) => item.trim().length > 0);

  const buildPayload = useCallback(
    (data: CreatorFormValues) => {
      if (!currentOrg?.organizationId || !user?.id) {
        throw new Error('Missing org or user context');
      }

      return {
        orgId: currentOrg.organizationId,
        creatorId: user.id,
        operatingModel: engagementModel,
        title: data.title,
        businessProblem: data.problem_statement,
        expectedOutcomes: cleanArray(data.expected_outcomes),
        constraints: data.scope || '',
        currency: data.currency,
        budgetMin: data.budget_min,
        budgetMax: data.budget_max,
        expectedTimeline: data.expected_timeline || '8w',
        domainTags: data.domain_tags,
        urgency: 'standard',
        industrySegmentId: data.industry_segment_id || undefined,
        governanceModeOverride: governanceMode,
        contextBackground: data.context_background || undefined,
        rootCauses: cleanArray(data.root_causes),
        affectedStakeholders: data.affected_stakeholders.length > 0 ? data.affected_stakeholders : undefined,
        preferredApproach: cleanArray(data.preferred_approach),
        approachesNotOfInterest: cleanArray(data.approaches_not_of_interest),
        currentDeficiencies: cleanArray(data.current_deficiencies),
        maturityLevel: data.maturity_level || undefined,
        solutionMaturityId: data.solution_maturity_id || undefined,
        ipModel: data.ip_model || undefined,
      };
    },
    [currentOrg, user, engagementModel, governanceMode],
  );

  const handleSubmit = form.handleSubmit(async (data) => {
    if (tierLimit && !tierLimit.allowed) {
      setShowTierModal(true);
      return;
    }

    try {
      const payload = buildPayload(data);
      const result = await submitMutation.mutateAsync({
        ...payload,
        referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
        draftChallengeId: draftChallengeId || undefined,
      });

      if (result.challengeId && attachedFiles.length > 0 && currentOrg?.organizationId) {
        for (const file of attachedFiles) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${currentOrg.organizationId}/challenges/${result.challengeId}/${crypto.randomUUID()}_${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from('challenge-attachments')
            .upload(storagePath, file, { upsert: false, cacheControl: '3600' });

          if (!uploadError) {
            await supabase.from('challenge_attachments').insert({
              challenge_id: result.challengeId,
              section_key: 'creator_reference',
              source_type: 'file',
              storage_path: storagePath,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user?.id ?? null,
            });
          }
        }
      }

      toast.success(`Challenge "${data.title}" submitted to Curator. Track progress in My Challenges.`);
      navigate('/cogni/my-challenges');
    } catch {
      // Error handled by mutation onError
    }
  });

  const handleSaveDraft = async () => {
    const data = form.getValues();
    if (!currentOrg?.organizationId || !user?.id) return;

    try {
      const baseDraftPayload = {
        orgId: currentOrg.organizationId,
        creatorId: user.id,
        operatingModel: engagementModel,
        title: data.title || '',
        businessProblem: data.problem_statement || '',
        expectedOutcomes: cleanArray(data.expected_outcomes),
        constraints: data.scope || '',
        currency: data.currency,
        budgetMin: data.budget_min,
        budgetMax: data.budget_max,
        expectedTimeline: data.expected_timeline || '8w',
        domainTags: data.domain_tags || [],
        urgency: 'standard',
        industrySegmentId: data.industry_segment_id || undefined,
        governanceModeOverride: governanceMode,
        contextBackground: data.context_background || undefined,
        rootCauses: cleanArray(data.root_causes),
        affectedStakeholders: data.affected_stakeholders.length > 0 ? data.affected_stakeholders : undefined,
        preferredApproach: cleanArray(data.preferred_approach),
        approachesNotOfInterest: cleanArray(data.approaches_not_of_interest),
        currentDeficiencies: cleanArray(data.current_deficiencies),
        maturityLevel: data.maturity_level || undefined,
        solutionMaturityId: data.solution_maturity_id || undefined,
        ipModel: data.ip_model || undefined,
      };

      if (draftChallengeId) {
        await updateDraftMutation.mutateAsync({
          ...baseDraftPayload,
          challengeId: draftChallengeId,
        });
      } else {
        const result = await draftMutation.mutateAsync(baseDraftPayload);
        setDraftChallengeId(result.challengeId);
      }

      toast.success(draftChallengeId ? 'Draft updated' : 'Draft saved');
    } catch {
      // Error handled by mutation onError
    }
  };

  const isControlled = governanceMode === 'CONTROLLED';

  const handleFillTestData = useCallback(() => {
    const seed = engagementModel === 'AGG' ? AGG_SEED : MP_SEED;
    const domainIds = industrySegments.slice(0, 2).map((segment) => segment.id);

    // Match seed maturity code to actual md_solution_maturity record
    const maturityMatch = solutionMaturityOptions.find((m) =>
      m.code.replace('SOLUTION_', '').toUpperCase() === seed.maturity_level.toUpperCase()
    );

    form.reset({
      ...seed,
      maturity_level: maturityMatch?.code ?? seed.maturity_level,
      solution_maturity_id: maturityMatch?.id ?? '',
      industry_segment_id: industrySegments[0]?.id ?? '',
      domain_tags: domainIds,
    } as CreatorFormValues);
  }, [engagementModel, industrySegments, solutionMaturityOptions, form]);

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="essential" className="flex-1 gap-1.5">
              ✏️ Essential Details
            </TabsTrigger>
            <TabsTrigger value="context" className="flex-1 gap-1.5">
              📋 Additional Context
              {isControlled && <span className="text-destructive text-xs ml-1">*</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="essential" className="mt-6">
            <EssentialDetailsTab
              engagementModel={engagementModel}
              industrySegments={industrySegments}
              governanceMode={governanceMode}
            />
          </TabsContent>

          <TabsContent value="context" className="mt-6">
            <AdditionalContextTab
              governanceMode={governanceMode}
              attachedFiles={attachedFiles}
              onFilesChange={setAttachedFiles}
              referenceUrls={referenceUrls}
              onUrlsChange={setReferenceUrls}
            />
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleFillTestData}
          >
            <FlaskConical className="h-4 w-4 mr-1.5" />
            Fill Test Data
          </Button>
          <div className="flex items-center gap-3 ml-auto">
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isBusy}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save Draft
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
              Submit to Curator
            </Button>
          </div>
        </div>
      </form>

      {showTierModal && tierLimit && (
        <TierLimitModal
          isOpen={showTierModal}
          onClose={() => setShowTierModal(false)}
          tierName={tierLimit.tier_name}
          maxAllowed={tierLimit.max_allowed}
          currentActive={tierLimit.current_active}
        />
      )}
    </FormProvider>
  );
}
