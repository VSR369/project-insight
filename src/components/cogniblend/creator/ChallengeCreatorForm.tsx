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

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { supabase } from '@/integrations/supabase/client';
import type { GovernanceMode } from '@/lib/governanceMode';

import { EssentialDetailsTab } from './EssentialDetailsTab';
import { AdditionalContextTab } from './AdditionalContextTab';
import { MP_SEED, AGG_SEED } from './creatorSeedContent';

/* ── Stakeholder row shape ── */
const stakeholderRowSchema = z.object({
  stakeholder_name: z.string(),
  role: z.string(),
  impact_description: z.string(),
  adoption_challenge: z.string(),
});

/* ── Schema builders ── */

function buildCreatorSchema(governanceMode: GovernanceMode, engagementModel: string) {
  const isQuick = governanceMode === 'QUICK';
  const isControlled = governanceMode === 'CONTROLLED';

  const problemMin = isQuick ? 100 : 200;
  const scopeRule = isQuick
    ? z.string().optional().default('')
    : z.string().min(100, 'At least 100 characters required');

  const ipRule = isQuick
    ? z.string().optional().default('IP-NEL')
    : z.string().min(1, 'Please select an IP model');

  // Expected outcomes — line items (string[])
  const outcomesRule = z.array(z.string()).min(1, 'Add at least one expected outcome');

  // Context fields — line items for CONTROLLED, optional arrays otherwise
  const lineItemRule = isControlled
    ? z.array(z.string()).min(1, 'Required for Controlled governance')
    : z.array(z.string()).default(['']);

  const contextStringRule = isControlled
    ? z.string().min(1, 'Required for Controlled governance')
    : z.string().optional().default('');

  const stakeholderRule = isControlled
    ? z.array(stakeholderRowSchema).min(1, 'Required for Controlled governance')
    : z.array(stakeholderRowSchema).default([]);

  const base = z.object({
    title: z.string().trim().min(1, 'Title is required').max(100, 'Max 100 characters'),
    problem_statement: z.string().min(problemMin, `At least ${problemMin} characters required`),
    scope: scopeRule,
    maturity_level: z.string().min(1, 'Please select a solution type'),
    industry_segment_id: z.string().min(1, 'Please select a primary industry segment'),
    domain_tags: z.array(z.string()).min(1, 'Select at least 1 domain').max(3, 'Max 3 domains'),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
    budget_min: z.coerce.number().min(0).default(0),
    budget_max: z.coerce.number().min(0).default(0),
    ip_model: ipRule,
    expected_outcomes: outcomesRule,
    // Tab 2 — context fields
    context_background: contextStringRule,
    preferred_approach: lineItemRule,
    approaches_not_of_interest: lineItemRule,
    affected_stakeholders: stakeholderRule,
    current_deficiencies: lineItemRule,
    root_causes: lineItemRule,
    expected_timeline: z.string().optional().default(''),
  });

  // MP requires budget range
  if (engagementModel === 'MP') {
    return base.refine(
      (d) => d.budget_max > 0,
      { message: 'Maximum budget is required for Marketplace', path: ['budget_max'] },
    ).refine(
      (d) => d.budget_min < d.budget_max,
      { message: 'Min must be less than max', path: ['budget_min'] },
    );
  }

  return base;
}

export type CreatorFormValues = {
  title: string;
  problem_statement: string;
  scope: string;
  maturity_level: string;
  domain_tags: string[];
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  budget_min: number;
  budget_max: number;
  ip_model: string;
  expected_outcomes: string[];
  context_background: string;
  preferred_approach: string[];
  approaches_not_of_interest: string[];
  affected_stakeholders: Array<{ stakeholder_name: string; role: string; impact_description: string; adoption_challenge: string }>;
  current_deficiencies: string[];
  root_causes: string[];
  expected_timeline: string;
  industry_segment_id: string;
};

/* ── Props ── */

interface ChallengeCreatorFormProps {
  engagementModel: string;
  governanceMode: GovernanceMode;
}

export function ChallengeCreatorForm({ engagementModel, governanceMode }: ChallengeCreatorFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();
  const { data: tierLimit } = useTierLimitCheck();
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();
  const updateDraftMutation = useUpdateDraft();

  const [showTierModal, setShowTierModal] = useState(false);
  const [activeTab, setActiveTab] = useState('essential');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [draftChallengeId, setDraftChallengeId] = useState<string | null>(searchParams.get('draft'));

  const schema = useMemo(
    () => buildCreatorSchema(governanceMode, engagementModel),
    [governanceMode, engagementModel],
  );

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      title: '',
      problem_statement: '',
      scope: '',
      maturity_level: '',
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

  // Load draft data when opened with ?draft=<id>
  const draftLoaded = useRef(false);
  useEffect(() => {
    if (!draftChallengeId || draftLoaded.current) return;
    draftLoaded.current = true;
    (async () => {
      const { data: ch } = await supabase
        .from('challenges')
        .select('title, problem_statement, scope, maturity_level, ip_model, domain_tags, currency_code, reward_structure, extended_brief, expected_outcomes, industry_segment_id, phase_schedule')
        .eq('id', draftChallengeId)
        .maybeSingle();
      if (!ch) return;
      const rs = ch.reward_structure as Record<string, unknown> | null;
      const eb = ch.extended_brief as Record<string, unknown> | null;
      const eo = ch.expected_outcomes as any;
      const ps = ch.phase_schedule as Record<string, unknown> | null;

      // Parse line items from DB format { items: [{ name: "..." }] } or string[]
      const parseLineItems = (val: unknown): string[] => {
        if (!val) return [''];
        if (Array.isArray(val)) return val.length > 0 ? val : [''];
        if (typeof val === 'object' && val !== null && 'items' in val) {
          const items = (val as any).items;
          if (Array.isArray(items)) return items.map((i: any) => i.name || i).filter(Boolean);
        }
        if (typeof val === 'string' && val.trim()) return [val];
        return [''];
      };

      const parseStakeholders = (val: unknown): Array<{ stakeholder_name: string; role: string; impact_description: string; adoption_challenge: string }> => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          try { const parsed = JSON.parse(val); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
        }
        return [];
      };

      form.reset({
        title: (ch.title as string) || '',
        problem_statement: (ch.problem_statement as string) || '',
        scope: (ch.scope as string) || '',
        maturity_level: ((ch.maturity_level as string) || '').toUpperCase(),
        industry_segment_id: (ch.industry_segment_id as string) || '',
        domain_tags: (ch.domain_tags as string[]) || [],
        currency: ((rs?.currency as string) || 'USD') as any,
        budget_min: Number(rs?.budget_min ?? 0),
        budget_max: Number(rs?.budget_max ?? 0),
        ip_model: (ch.ip_model as string) || '',
        expected_outcomes: parseLineItems(eo),
        context_background: (eb?.context_background as string) || '',
        preferred_approach: parseLineItems(eb?.preferred_approach),
        approaches_not_of_interest: parseLineItems(eb?.approaches_not_of_interest),
        affected_stakeholders: parseStakeholders(eb?.affected_stakeholders),
        current_deficiencies: parseLineItems(eb?.current_deficiencies),
        root_causes: parseLineItems(eb?.root_causes),
        expected_timeline: (ps?.expected_timeline as string) || '',
      });
    })();
  }, [draftChallengeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSubmitting = submitMutation.isPending;
  const isSaving = draftMutation.isPending || updateDraftMutation.isPending;
  const isBusy = isSubmitting || isSaving;

  /** Filter empty strings from line-item arrays */
  const cleanArray = (arr: string[] | undefined): string[] =>
    (arr || []).filter((s) => s.trim().length > 0);

  const buildPayload = useCallback((data: CreatorFormValues) => {
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
      ipModel: data.ip_model || undefined,
    };
  }, [currentOrg, user, engagementModel, governanceMode]);

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

       // Upload attached files only (extended_brief already saved in Write 1)
      if (result.challengeId && attachedFiles.length > 0 && currentOrg?.organizationId) {
        for (const file of attachedFiles) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${currentOrg.organizationId}/challenges/${result.challengeId}/${crypto.randomUUID()}_${safeName}`;
          const { error: uploadErr } = await supabase.storage
            .from('challenge-attachments')
            .upload(storagePath, file, { upsert: false, cacheControl: '3600' });

          if (!uploadErr) {
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
        ipModel: data.ip_model || undefined,
      };

      if (draftChallengeId) {
        await updateDraftMutation.mutateAsync({ ...baseDraftPayload, challengeId: draftChallengeId });
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
    const domainIds = industrySegments.slice(0, 2).map((s) => s.id);
    form.reset({
      ...seed,
      industry_segment_id: industrySegments[0]?.id ?? '',
      domain_tags: domainIds,
    } as CreatorFormValues);
  }, [engagementModel, industrySegments, form]);

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

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={handleFillTestData}>
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
