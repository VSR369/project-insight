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

import { useState, useCallback, useMemo, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Send, Save, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useSubmitSolutionRequest, useSaveDraft } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { supabase } from '@/integrations/supabase/client';
import type { GovernanceMode } from '@/lib/governanceMode';

import { EssentialDetailsTab } from './EssentialDetailsTab';
import { AdditionalContextTab } from './AdditionalContextTab';

/* ── Schema builders ── */

function buildCreatorSchema(governanceMode: GovernanceMode, engagementModel: string) {
  const isQuick = governanceMode === 'QUICK';
  const isControlled = governanceMode === 'CONTROLLED';

  // QUICK: relaxed minimums; STRUCTURED/CONTROLLED: stricter
  const problemMin = isQuick ? 100 : 200;
  const scopeRule = isQuick
    ? z.string().optional().default('')
    : z.string().min(100, 'At least 100 characters required');

  const ipRule = isQuick
    ? z.string().optional().default('IP-NEL')
    : z.string().min(1, 'Please select an IP model');

  const outcomesRule = isQuick
    ? z.string().optional().default('')
    : z.string().min(1, 'Expected results are required');

  // Context fields — required only for CONTROLLED
  const contextRule = isControlled
    ? z.string().min(1, 'Required for Controlled governance')
    : z.string().optional().default('');

  const base = z.object({
    title: z.string().trim().min(1, 'Title is required').max(100, 'Max 100 characters'),
    problem_statement: z.string().min(problemMin, `At least ${problemMin} characters required`),
    scope: scopeRule,
    maturity_level: z.enum(['blueprint', 'poc', 'pilot'], {
      errorMap: () => ({ message: 'Please select a solution type' }),
    }),
    domain_tags: z.array(z.string()).min(1, 'Select at least 1 domain').max(3, 'Max 3 domains'),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
    budget_min: z.coerce.number().min(0).default(0),
    budget_max: z.coerce.number().min(0).default(0),
    ip_model: ipRule,
    expected_outcomes: outcomesRule,
    // Tab 2 — context fields
    context_background: contextRule,
    preferred_approach: contextRule,
    approaches_not_of_interest: isControlled
      ? z.string().min(1, 'Required for Controlled governance')
      : z.string().optional().default(''),
    affected_stakeholders: contextRule,
    current_deficiencies: contextRule,
    root_causes: contextRule,
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

export type CreatorFormValues = z.infer<ReturnType<typeof buildCreatorSchema>> extends z.infer<infer T> ? z.infer<T> : {
  title: string;
  problem_statement: string;
  scope: string;
  maturity_level: 'blueprint' | 'poc' | 'pilot';
  domain_tags: string[];
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  budget_min: number;
  budget_max: number;
  ip_model: string;
  expected_outcomes: string;
  context_background: string;
  preferred_approach: string;
  approaches_not_of_interest: string;
  affected_stakeholders: string;
  current_deficiencies: string;
  root_causes: string;
  expected_timeline: string;
};

/* ── Props ── */

interface ChallengeCreatorFormProps {
  engagementModel: string;
  governanceMode: GovernanceMode;
}

export function ChallengeCreatorForm({ engagementModel, governanceMode }: ChallengeCreatorFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();
  const { data: tierLimit } = useTierLimitCheck();
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();

  const [showTierModal, setShowTierModal] = useState(false);
  const [activeTab, setActiveTab] = useState('essential');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

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
      maturity_level: undefined,
      domain_tags: [],
      currency: 'USD',
      budget_min: 0,
      budget_max: 0,
      ip_model: governanceMode === 'QUICK' ? 'IP-NEL' : '',
      expected_outcomes: '',
      context_background: '',
      preferred_approach: '',
      approaches_not_of_interest: '',
      affected_stakeholders: '',
      current_deficiencies: '',
      root_causes: '',
      expected_timeline: '',
    },
  });

  const isSubmitting = submitMutation.isPending;
  const isSaving = draftMutation.isPending;
  const isBusy = isSubmitting || isSaving;

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
      expectedOutcomes: data.expected_outcomes || '',
      constraints: data.scope || '',
      currency: data.currency,
      budgetMin: data.budget_min,
      budgetMax: data.budget_max,
      expectedTimeline: data.expected_timeline || '8w',
      domainTags: data.domain_tags,
      urgency: 'standard',
      beneficiariesMapping: data.affected_stakeholders || undefined,
      governanceModeOverride: governanceMode,
    };
  }, [currentOrg, user, engagementModel, governanceMode]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (tierLimit && !tierLimit.allowed) {
      setShowTierModal(true);
      return;
    }
    try {
      const payload = buildPayload(data);
      const result = await submitMutation.mutateAsync(payload);

      // Store extended_brief + maturity_level + ip_model
      if (result.challengeId) {
        await supabase
          .from('challenges')
          .update({
            maturity_level: data.maturity_level,
            ip_model: data.ip_model || null,
            extended_brief: {
              context_background: data.context_background || undefined,
              preferred_approach: data.preferred_approach || undefined,
              approaches_not_of_interest: data.approaches_not_of_interest || undefined,
              affected_stakeholders: data.affected_stakeholders || undefined,
              current_deficiencies: data.current_deficiencies || undefined,
              root_causes: data.root_causes || undefined,
            },
          } as any)
          .eq('id', result.challengeId);
      }
      navigate('/cogni/my-challenges');
    } catch {
      // Error handled by mutation onError
    }
  });

  const handleSaveDraft = async () => {
    const data = form.getValues();
    if (!currentOrg?.organizationId || !user?.id) return;

    try {
      await draftMutation.mutateAsync({
        orgId: currentOrg.organizationId,
        creatorId: user.id,
        operatingModel: engagementModel,
        businessProblem: data.problem_statement || '',
        expectedOutcomes: data.expected_outcomes || '',
        constraints: data.scope || '',
        currency: data.currency,
        budgetMin: data.budget_min,
        budgetMax: data.budget_max,
        expectedTimeline: data.expected_timeline || '8w',
        domainTags: data.domain_tags || [],
        urgency: 'standard',
        governanceModeOverride: governanceMode,
      });
      navigate('/cogni/my-challenges');
    } catch {
      // Error handled by mutation onError
    }
  };

  const isQuick = governanceMode === 'QUICK';
  const isControlled = governanceMode === 'CONTROLLED';

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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isBusy}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Draft
          </Button>
          <Button type="submit" disabled={isBusy}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
            Submit to Curator
          </Button>
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
