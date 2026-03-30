/**
 * ChallengeCreatorForm — 2-tab challenge creation form.
 * Tab 1 (Essential Details): mandatory fields.
 * Tab 2 (Additional Context): optional fields feeding the AI pipeline.
 * Supports Save Draft + Submit to Curator.
 */

import { useState, useCallback } from 'react';
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

import { EssentialDetailsTab } from './EssentialDetailsTab';
import { AdditionalContextTab } from './AdditionalContextTab';

/* ── Zod Schema ── */

const baseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Max 100 characters'),
  problem_statement: z.string().min(200, 'At least 200 characters required'),
  scope: z.string().min(100, 'At least 100 characters required'),
  maturity_level: z.enum(['blueprint', 'poc', 'pilot'], {
    errorMap: () => ({ message: 'Please select a solution type' }),
  }),
  domain_tags: z.array(z.string()).min(1, 'Select at least 1 domain').max(3, 'Max 3 domains'),
  currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
  budget_min: z.coerce.number().min(0).default(0),
  budget_max: z.coerce.number().min(0).default(0),
  ip_model: z.string().min(1, 'Please select an IP model'),
  expected_outcomes: z.string().min(1, 'Expected results are required'),
  // Tab 2 — optional
  context_background: z.string().optional().default(''),
  preferred_approach: z.string().optional().default(''),
  approaches_not_of_interest: z.string().optional().default(''),
  affected_stakeholders: z.string().optional().default(''),
  current_deficiencies: z.string().optional().default(''),
  root_causes: z.string().optional().default(''),
  expected_timeline: z.string().optional().default(''),
});

/** MP requires budget range */
const mpSchema = baseSchema.refine(
  (d) => d.budget_max > 0,
  { message: 'Maximum budget is required for Marketplace', path: ['budget_max'] },
).refine(
  (d) => d.budget_min < d.budget_max,
  { message: 'Min must be less than max', path: ['budget_min'] },
);

export type CreatorFormValues = z.infer<typeof baseSchema>;

/* ── Props ── */

interface ChallengeCreatorFormProps {
  engagementModel: string;
}

export function ChallengeCreatorForm({ engagementModel }: ChallengeCreatorFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();
  const { data: tierLimit } = useTierLimitCheck();
  const submitMutation = useSubmitSolutionRequest();
  const draftMutation = useSaveDraft();

  const [showTierModal, setShowTierModal] = useState(false);
  const [activeTab, setActiveTab] = useState('essential');

  const schema = engagementModel === 'MP' ? mpSchema : baseSchema;

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      problem_statement: '',
      scope: '',
      maturity_level: undefined,
      domain_tags: [],
      currency: 'USD',
      budget_min: 0,
      budget_max: 0,
      ip_model: '',
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
      expectedOutcomes: data.expected_outcomes,
      constraints: data.scope,
      currency: data.currency,
      budgetMin: data.budget_min,
      budgetMax: data.budget_max,
      expectedTimeline: data.expected_timeline || '8w',
      domainTags: data.domain_tags,
      urgency: 'standard',
      // Extended brief fields (Tab 2) — stored in extended_brief JSON
      beneficiariesMapping: data.affected_stakeholders || undefined,
    };
  }, [currentOrg, user, engagementModel]);

  const handleSubmit = form.handleSubmit(async (data) => {
    // Tier limit check
    if (tierLimit && !tierLimit.canCreate) {
      setShowTierModal(true);
      return;
    }
    try {
      const payload = buildPayload(data);
      const result = await submitMutation.mutateAsync(payload);

      // Store extended_brief fields separately via update
      if (result.challengeId) {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase
          .from('challenges')
          .update({
            maturity_level: data.maturity_level,
            ip_model: data.ip_model,
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
      const payload = {
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
      };
      await draftMutation.mutateAsync(payload);
      navigate('/cogni/my-challenges');
    } catch {
      // Error handled by mutation onError
    }
  };

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
            </TabsTrigger>
          </TabsList>

          <TabsContent value="essential" className="mt-6">
            <EssentialDetailsTab
              engagementModel={engagementModel}
              industrySegments={industrySegments}
            />
          </TabsContent>

          <TabsContent value="context" className="mt-6">
            <AdditionalContextTab />
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isBusy}
          >
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
          open={showTierModal}
          onOpenChange={setShowTierModal}
          tierCode={tierLimit.tierCode ?? ''}
          currentCount={tierLimit.currentCount ?? 0}
          maxAllowed={tierLimit.maxAllowed ?? 0}
        />
      )}
    </FormProvider>
  );
}
