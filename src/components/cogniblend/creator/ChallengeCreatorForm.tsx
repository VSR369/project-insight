/**
 * ChallengeCreatorForm — 2-tab challenge creation form.
 * Decomposed: schema in creatorFormSchema.ts, draft in useCreatorDraftSave.ts,
 * file upload in useCreatorFileUpload.ts, draft loading in useCreatorDraftLoader.ts.
 */

import { MinimumModeFlagsCard } from '@/components/cogniblend/shared/MinimumModeFlagsCard';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams } from 'react-router-dom';

import { CreatorFormActionBar } from './CreatorFormActionBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useOrgContext';
import { useChallengeSubmit } from '@/hooks/cogniblend/useChallengeSubmit';

import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { CreatorLegalPreview } from './CreatorLegalPreview';
import type { GovernanceMode } from '@/lib/governanceMode';
import { useGovernanceFieldRules } from '@/hooks/queries/useGovernanceFieldRules';
import { buildCreatorSchema, type CreatorFormValues, toFormMaturityCode } from './creatorFormSchema';
import { useCreatorDraftLoader } from '@/hooks/cogniblend/useCreatorDraftLoader';
import { useCreatorDraftSave } from '@/hooks/cogniblend/useCreatorDraftSave';
import { useCreatorFileUpload } from '@/hooks/cogniblend/useCreatorFileUpload';
import { EssentialDetailsTab } from './EssentialDetailsTab';
import { AdditionalContextTab } from './AdditionalContextTab';
import { ReferenceAttachmentsSection } from './ReferenceAttachmentsSection';
import { CreatorAIReviewDrawer } from './CreatorAIReviewDrawer';
import { EscrowCalculationDisplay } from '@/components/cogniblend/EscrowCalculationDisplay';
import { SolverAudiencePreview } from './SolverAudiencePreview';
import { QuickPublishSuccessScreen } from './QuickPublishSuccessScreen';
import { QuickPublishConfirmModal } from './QuickPublishConfirmModal';
import { EvaluationMethodSection } from './EvaluationMethodSection';
import { useDeleteQuickLegalOverride, useQuickLegalOverride, useUploadQuickLegalOverride } from '@/hooks/queries/useQuickLegalOverride';
import { useGeoContextForOrg } from '@/hooks/queries/useGeoContextForOrg';
import { useCreatorTemplateContext } from '@/hooks/cogniblend/useCreatorTemplateContext';
import { audienceSelectable } from '@/services/engagementModelRulesService';
import { SolverAudienceSelector } from './SolverAudienceSelector';
import { useQuickLegalOverrideControls } from '@/hooks/cogniblend/useQuickLegalOverrideControls';
import { useCreatorSubmitFlow } from '@/hooks/cogniblend/useCreatorSubmitFlow';
import { useCreatorFillTestData } from '@/hooks/cogniblend/useCreatorFillTestData';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';

interface ChallengeCreatorFormProps {
  engagementModel: string;
  governanceMode: GovernanceMode;
  industrySegmentId: string;
  onDraftModeSync?: (governance: GovernanceMode, engagement: string, industrySegmentId?: string) => void;
  onFillTestData?: () => void;
  onDraftIdChange?: (id: string) => void;
  onIndustrySegmentResolved?: (id: string) => void;
}

export type { CreatorFormValues } from './creatorFormSchema';

export function ChallengeCreatorForm({ engagementModel, governanceMode, industrySegmentId, onDraftModeSync, onFillTestData, onDraftIdChange, onIndustrySegmentResolved }: ChallengeCreatorFormProps) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: orgContext } = useOrgModelContext();
  const { data: industrySegmentOptions = [] } = useIndustrySegmentOptions();
  
  const { data: solutionMaturityOptions = [] } = useSolutionMaturityList();
  const { data: tierLimit } = useTierLimitCheck();
  const submitMutation = useChallengeSubmit();
  const { data: fieldRules } = useGovernanceFieldRules(governanceMode);
  const { uploadFiles } = useCreatorFileUpload();
  const uploadQuickOverride = useUploadQuickLegalOverride();
  const deleteQuickOverride = useDeleteQuickLegalOverride();

  const [showTierModal, setShowTierModal] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [aiReviewCompleted, setAiReviewCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState('essential');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [publishedResult, setPublishedResult] = useState<{ challengeId: string; title: string } | null>(null);
  const [showQuickConfirm, setShowQuickConfirm] = useState(false);
  const [pendingQuickData, setPendingQuickData] = useState<CreatorFormValues | null>(null);

  const schema = useMemo(() => buildCreatorSchema(governanceMode, engagementModel), [governanceMode, engagementModel]);
  const isControlled = governanceMode === 'CONTROLLED';
  const isQuick = governanceMode === 'QUICK';

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(schema as ReturnType<typeof buildCreatorSchema>),
    defaultValues: {
      title: '', hook: '', problem_statement: '', scope: '', maturity_level: '',
      solution_maturity_id: '', industry_segment_id: industrySegmentId, domain_tags: [],
      currency_code: 'USD', platinum_award: 0,
      ip_model: isQuick ? 'IP-NEL' : '', expected_outcomes: [''],
      weighted_criteria: [], deliverables_list: [],
      context_background: '', preferred_approach: [''], approaches_not_of_interest: [''],
      affected_stakeholders: [], current_deficiencies: [''], root_causes: [''], expected_timeline: '',
      creator_legal_instructions: '',
      quick_legal_override_mode: 'KEEP_DEFAULT',
      solver_audience: 'ALL' as const,
      evaluation_method: 'SINGLE' as const,
      evaluator_count: 1,
    },
  });

  const draftSave = useCreatorDraftSave({
    form,
    orgId: currentOrg?.organizationId, userId: user?.id,
    engagementModel, governanceMode, industrySegmentId, referenceUrls, onDraftIdChange,
  });

  useEffect(() => { draftSave.initFromUrl(searchParams.get('draft')); }, []);

  const handleReferenceUrlsLoaded = useCallback((urls: string[]) => {
    if (urls.length > 0) setReferenceUrls(urls);
  }, []);

  useCreatorDraftLoader(draftSave.draftChallengeId, form, governanceMode, engagementModel, onDraftModeSync, handleReferenceUrlsLoaded);
  const { data: quickLegalOverride } = useQuickLegalOverride(draftSave.draftChallengeId ?? undefined);
  const { data: geoContext } = useGeoContextForOrg(currentOrg?.organizationId);

  const templateContext = useCreatorTemplateContext(form, governanceMode, engagementModel, currentOrg?.orgName, geoContext);

  const currentMaturityLevel = form.watch('maturity_level');
  const currentSolutionMaturityId = form.watch('solution_maturity_id');

  useEffect(() => {
    if (!solutionMaturityOptions.length || !currentMaturityLevel || currentSolutionMaturityId) return;
    const matched = solutionMaturityOptions.find((o) => o.code === toFormMaturityCode(currentMaturityLevel));
    if (!matched) return;
    if (currentMaturityLevel !== matched.code) form.setValue('maturity_level', matched.code, { shouldDirty: false });
    form.setValue('solution_maturity_id', matched.id, { shouldDirty: false });
  }, [currentMaturityLevel, currentSolutionMaturityId, form, solutionMaturityOptions]);

  const isSubmitting = submitMutation.isPending;
  const isBusy = isSubmitting || draftSave.isSaving || uploadQuickOverride.isPending || deleteQuickOverride.isPending;

  const { handleQuickLegalOverrideChange, handleQuickLegalOverrideRemove, handleQuickLegalOverrideUpload } =
    useQuickLegalOverrideControls({ form, isQuick, quickLegalOverride, userId: user?.id, saveDraft: draftSave.handleSaveDraft, uploadQuickOverride, deleteQuickOverride });

  const { handleSubmit, handleQuickConfirm } = useCreatorSubmitFlow({
    form, isQuick, engagementModel, governanceMode, industrySegmentId,
    orgId: currentOrg?.organizationId, userId: user?.id, tierLimit, submitMutation, uploadFiles,
    referenceUrls, attachedFiles, draftChallengeId: draftSave.draftChallengeId,
    pendingQuickData, setPendingQuickData, setShowQuickConfirm, setShowTierModal, setPublishedResult,
  });

  const handleFillTestData = useCreatorFillTestData({
    form, governanceMode, engagementModel, industrySegmentId, solutionMaturityOptions, fieldRules,
    primaryIndustryId: orgContext?.primaryIndustryId, firstIndustryOptionId: industrySegmentOptions[0]?.id,
    onIndustrySegmentResolved, onFillTestData, saveDraft: draftSave.handleSaveDraft,
  });

  if (publishedResult && isQuick) {
    return (
      <QuickPublishSuccessScreen
        challengeId={publishedResult.challengeId}
        challengeTitle={publishedResult.title}
        engagementModel={engagementModel}
        solverAudience={form.getValues('solver_audience')}
        visibility={null}
      />
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-lg h-auto p-1.5 gap-2 bg-muted/60 border border-border rounded-xl">
            <TabsTrigger
              value="essential"
              className="flex-1 gap-2 py-3 px-5 text-sm font-semibold rounded-lg border border-transparent data-[state=active]:border-primary/30 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200"
            >
              ✏️ Essential Details
            </TabsTrigger>
{isControlled && (
              <TabsTrigger
                value="context"
                className="flex-1 gap-2 py-3 px-5 text-sm font-semibold rounded-lg border border-transparent data-[state=active]:border-accent/40 data-[state=active]:bg-background data-[state=active]:text-accent-foreground data-[state=active]:shadow-md transition-all duration-200"
              >
                📋 Additional Context
                <span className="text-destructive text-xs font-bold ml-0.5">*</span>
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="essential" className="mt-6"><EssentialDetailsTab engagementModel={engagementModel} governanceMode={governanceMode} fieldRules={fieldRules} /></TabsContent>
          <TabsContent value="context" className="mt-6"><AdditionalContextTab governanceMode={governanceMode} fieldRules={fieldRules} engagementModel={engagementModel} draftChallengeId={draftSave.draftChallengeId ?? undefined} /></TabsContent>
        </Tabs>
        {!isQuick && (
          <ReferenceAttachmentsSection attachedFiles={attachedFiles} onFilesChange={setAttachedFiles} referenceUrls={referenceUrls} onUrlsChange={setReferenceUrls} />
        )}
        {governanceMode !== 'QUICK' && (
          <EvaluationMethodSection governanceMode={governanceMode} />
        )}
        {governanceMode !== 'QUICK' && (
          <EscrowCalculationDisplay
            prizePlatinum={form.watch('platinum_award')}
            currencyCode={form.watch('currency_code')}
            governanceMode={governanceMode}
          />
        )}
        {audienceSelectable(engagementModel) && <SolverAudienceSelector />}
        <MinimumModeFlagsCard challengeId={draftSave.draftChallengeId ?? undefined} />
        <CreatorLegalPreview
          governanceMode={governanceMode}
          engagementModel={engagementModel}
          organizationId={currentOrg?.organizationId}
          challengeId={draftSave.draftChallengeId ?? undefined}
          quickLegalOverride={quickLegalOverride}
          quickOverrideMode={form.watch('quick_legal_override_mode')}
          onQuickOverrideModeChange={handleQuickLegalOverrideChange}
          onQuickOverrideUpload={handleQuickLegalOverrideUpload}
          onQuickOverrideRemove={handleQuickLegalOverrideRemove}
          isQuickOverrideBusy={uploadQuickOverride.isPending || deleteQuickOverride.isPending}
          templateContext={templateContext}
        />
        <CreatorFormActionBar
          governanceMode={governanceMode}
          isBusy={isBusy}
          isSubmitting={isSubmitting}
          isSaving={draftSave.isSaving}
          hasDraft={!!draftSave.draftChallengeId}
          onFillTestData={handleFillTestData}
          onSaveDraft={draftSave.handleSaveDraft}
          onAIReview={async () => { await draftSave.handleSaveDraft(); setShowAIReview(true); }}
        />
      </form>
      {showTierModal && tierLimit && <TierLimitModal isOpen={showTierModal} onClose={() => setShowTierModal(false)} tierName={tierLimit.tier_name} maxAllowed={tierLimit.max_allowed} currentActive={tierLimit.current_active} />}
      {showAIReview && draftSave.draftChallengeId && <CreatorAIReviewDrawer open={showAIReview} onClose={() => setShowAIReview(false)} challengeId={draftSave.draftChallengeId} governanceMode={governanceMode} engagementModel={engagementModel} industrySegmentId={industrySegmentId} onReviewComplete={() => setAiReviewCompleted(true)} />}
      {isQuick && pendingQuickData && (
        <QuickPublishConfirmModal
          open={showQuickConfirm}
          onOpenChange={(o) => { setShowQuickConfirm(o); if (!o) setPendingQuickData(null); }}
          onConfirm={handleQuickConfirm}
          challengeTitle={pendingQuickData.title}
          engagementModel={engagementModel}
          solverAudience={pendingQuickData.solver_audience ?? 'ALL'}
          visibility={null}
          isSubmitting={isSubmitting}
        />
      )}
    </FormProvider>
  );
}
