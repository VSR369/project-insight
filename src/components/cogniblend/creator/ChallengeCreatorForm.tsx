/**
 * ChallengeCreatorForm — 2-tab challenge creation form.
 * Decomposed: schema in creatorFormSchema.ts, draft in useCreatorDraftSave.ts,
 * file upload in useCreatorFileUpload.ts, draft loading in useCreatorDraftLoader.ts.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Save, Loader2, FlaskConical, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useSubmitSolutionRequest } from '@/hooks/cogniblend/useSubmitSolutionRequest';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';
import { useSolutionMaturityList } from '@/hooks/queries/useSolutionMaturity';
import TierLimitModal from '@/components/cogniblend/TierLimitModal';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import type { GovernanceMode } from '@/lib/governanceMode';
import { useGovernanceFieldRules } from '@/hooks/queries/useGovernanceFieldRules';
import { filterSeedByGovernance } from '@/lib/cogniblend/governanceFieldFilter';
import { buildCreatorSchema, type CreatorFormValues, toFormMaturityCode } from './creatorFormSchema';
import { useCreatorDraftLoader } from '@/hooks/cogniblend/useCreatorDraftLoader';
import { useCreatorDraftSave } from '@/hooks/cogniblend/useCreatorDraftSave';
import { useCreatorFileUpload } from '@/hooks/cogniblend/useCreatorFileUpload';
import { EssentialDetailsTab } from './EssentialDetailsTab';
import { AdditionalContextTab } from './AdditionalContextTab';
import { CreatorAIReviewDrawer } from './CreatorAIReviewDrawer';
import { MP_SEED, AGG_SEED } from './creatorSeedContent';

interface ChallengeCreatorFormProps {
  engagementModel: string;
  governanceMode: GovernanceMode;
  industrySegmentId: string;
  onDraftModeSync?: (governance: GovernanceMode, engagement: string) => void;
  onFillTestData?: () => void;
  onDraftIdChange?: (id: string) => void;
}

export type { CreatorFormValues } from './creatorFormSchema';

export function ChallengeCreatorForm({ engagementModel, governanceMode, industrySegmentId, onDraftModeSync, onFillTestData, onDraftIdChange }: ChallengeCreatorFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const { data: industrySegments = [] } = useIndustrySegmentOptions();
  const { data: solutionMaturityOptions = [] } = useSolutionMaturityList();
  const { data: tierLimit } = useTierLimitCheck();
  const submitMutation = useSubmitSolutionRequest();
  const { data: fieldRules } = useGovernanceFieldRules(governanceMode);
  const { uploadFiles } = useCreatorFileUpload();

  const [draftForm, setDraftForm] = useState<ReturnType<typeof useForm<CreatorFormValues>> | null>(null);
  const draftSave = useCreatorDraftSave({
    form: draftForm,
    orgId: currentOrg?.organizationId, userId: user?.id,
    engagementModel, governanceMode, industrySegmentId, onDraftIdChange,
  });

  const [showTierModal, setShowTierModal] = useState(false);
  const [showLegalGate, setShowLegalGate] = useState(false);
  const [showAIReview, setShowAIReview] = useState(false);
  const [aiReviewCompleted, setAiReviewCompleted] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<CreatorFormValues | null>(null);
  const [activeTab, setActiveTab] = useState('essential');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);

  const schema = useMemo(() => buildCreatorSchema(governanceMode, engagementModel), [governanceMode, engagementModel]);
  const isControlled = governanceMode === 'CONTROLLED';
  const isQuick = governanceMode === 'QUICK';

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(schema as ReturnType<typeof buildCreatorSchema>),
    defaultValues: {
      title: '', hook: '', problem_statement: '', scope: '', maturity_level: '',
      solution_maturity_id: '', industry_segment_id: industrySegmentId, domain_tags: [],
      currency: 'USD', budget_min: 0, budget_max: 0,
      ip_model: isQuick ? 'IP-NEL' : '', expected_outcomes: [''],
      context_background: '', preferred_approach: [''], approaches_not_of_interest: [''],
      affected_stakeholders: [], current_deficiencies: [''], root_causes: [''], expected_timeline: '',
    },
  });

  // Wire form into draft save (workaround for hook ordering)
  const draftSaveWithForm = useMemo(() => ({ ...draftSave }), [draftSave]);
  useEffect(() => { draftSaveWithForm.form = form; }, [form]);

  useEffect(() => { draftSave.initFromUrl(searchParams.get('draft')); }, []);

  useCreatorDraftLoader(draftSave.draftChallengeId, form, governanceMode, engagementModel, onDraftModeSync);

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
  const isBusy = isSubmitting || draftSave.isSaving;

  const cleanArray = (items: string[] | undefined): string[] => (items || []).filter((i) => i.trim().length > 0);

  const buildPayload = useCallback((data: CreatorFormValues) => {
    if (!currentOrg?.organizationId || !user?.id) throw new Error('Missing org or user context');
    return {
      orgId: currentOrg.organizationId, creatorId: user.id, operatingModel: engagementModel,
      title: data.title, businessProblem: data.problem_statement,
      expectedOutcomes: cleanArray(data.expected_outcomes), constraints: data.scope || '',
      currency: data.currency, budgetMin: data.budget_min, budgetMax: data.budget_max,
      expectedTimeline: data.expected_timeline || '8w', domainTags: data.domain_tags, urgency: 'standard',
      industrySegmentId: industrySegmentId || data.industry_segment_id || undefined,
      governanceModeOverride: governanceMode,
      contextBackground: data.context_background || undefined, rootCauses: cleanArray(data.root_causes),
      affectedStakeholders: data.affected_stakeholders.length > 0 ? data.affected_stakeholders : undefined,
      preferredApproach: cleanArray(data.preferred_approach),
      approachesNotOfInterest: cleanArray(data.approaches_not_of_interest),
      currentDeficiencies: cleanArray(data.current_deficiencies),
      maturityLevel: data.maturity_level || undefined, solutionMaturityId: data.solution_maturity_id || undefined,
      ipModel: data.ip_model || undefined, hook: data.hook || undefined,
    };
  }, [currentOrg, user, engagementModel, governanceMode, industrySegmentId]);

  const executeSubmit = useCallback(async (data: CreatorFormValues) => {
    try {
      const payload = buildPayload(data);
      const result = await submitMutation.mutateAsync({
        ...payload, referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
        draftChallengeId: draftSave.draftChallengeId || undefined,
      });
      if (result.challengeId && attachedFiles.length > 0 && currentOrg?.organizationId && user?.id) {
        await uploadFiles(attachedFiles, { challengeId: result.challengeId, orgId: currentOrg.organizationId, userId: user.id });
      }
      toast.success(isQuick ? 'Challenge published! Solvers can now discover and apply.' : `Challenge "${data.title}" submitted to Curator for review.`);
      navigate('/cogni/my-challenges');
    } catch { /* handled by mutation onError */ }
  }, [buildPayload, submitMutation, referenceUrls, draftSave.draftChallengeId, attachedFiles, currentOrg, user, navigate, isQuick, uploadFiles]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (tierLimit && !tierLimit.allowed) { setShowTierModal(true); return; }
    setPendingSubmitData(data); setShowLegalGate(true);
  });

  const handleLegalAccepted = useCallback(() => {
    setShowLegalGate(false);
    if (pendingSubmitData) { executeSubmit(pendingSubmitData); setPendingSubmitData(null); }
  }, [pendingSubmitData, executeSubmit]);

  const handleFillTestData = useCallback(() => {
    const seed = engagementModel === 'AGG' ? AGG_SEED : MP_SEED;
    const domainIds = industrySegments.slice(0, 2).map((s) => s.id);
    const maturityMatch = solutionMaturityOptions.find((m) => m.code.replace('SOLUTION_', '').toUpperCase() === seed.maturity_level.toUpperCase());
    const filtered = fieldRules ? filterSeedByGovernance({ ...seed, domain_tags: domainIds, maturity_level: maturityMatch?.code ?? seed.maturity_level, solution_maturity_id: maturityMatch?.id ?? '', industry_segment_id: industrySegments[0]?.id ?? '' }, fieldRules) : { ...seed, domain_tags: domainIds };
    form.reset(filtered as CreatorFormValues);
    onFillTestData?.();
    setTimeout(async () => { await draftSave.handleSaveDraft(); toast.success('Test data filled & saved as draft'); }, 150);
  }, [engagementModel, industrySegments, solutionMaturityOptions, form, fieldRules, onFillTestData, draftSave]);

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="essential" className="flex-1 gap-1.5">✏️ Essential Details</TabsTrigger>
            <TabsTrigger value="context" className="flex-1 gap-1.5">📋 Additional Context{isControlled && <span className="text-destructive text-xs ml-1">*</span>}</TabsTrigger>
          </TabsList>
          <TabsContent value="essential" className="mt-6"><EssentialDetailsTab engagementModel={engagementModel} industrySegments={industrySegments} governanceMode={governanceMode} fieldRules={fieldRules} /></TabsContent>
          <TabsContent value="context" className="mt-6"><AdditionalContextTab governanceMode={governanceMode} fieldRules={fieldRules} attachedFiles={attachedFiles} onFilesChange={setAttachedFiles} referenceUrls={referenceUrls} onUrlsChange={setReferenceUrls} /></TabsContent>
        </Tabs>
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={handleFillTestData}><FlaskConical className="h-4 w-4 mr-1.5" />Fill Test Data</Button>
          <div className="flex items-center gap-3 ml-auto">
            <Button type="button" variant="outline" onClick={draftSave.handleSaveDraft} disabled={isBusy}>{draftSave.isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}Save Draft</Button>
            <Button type="button" variant={isControlled ? 'default' : 'outline'} onClick={async () => { await draftSave.handleSaveDraft(); setShowAIReview(true); }} disabled={isBusy || !draftSave.draftChallengeId} className="gap-1.5"><Sparkles className="h-4 w-4" />AI Review{isControlled && <Badge variant="secondary" className="ml-1 text-[10px]">Required</Badge>}{!isControlled && !isQuick && <Badge variant="outline" className="ml-1 text-[10px]">Recommended</Badge>}</Button>
            <Button type="submit" disabled={isBusy || (isControlled && !aiReviewCompleted)}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}{isQuick ? 'Submit & Publish' : 'Submit to Curator'}</Button>
          </div>
        </div>
      </form>
      {showTierModal && tierLimit && <TierLimitModal isOpen={showTierModal} onClose={() => setShowTierModal(false)} tierName={tierLimit.tier_name} maxAllowed={tierLimit.max_allowed} currentActive={tierLimit.current_active} />}
      {showLegalGate && <LegalGateModal triggerEvent="CHALLENGE_SUBMIT" onAllAccepted={handleLegalAccepted} onDeclined={() => { setShowLegalGate(false); setPendingSubmitData(null); toast.error('Submission cancelled — legal agreement declined'); }} />}
      {showAIReview && draftSave.draftChallengeId && <CreatorAIReviewDrawer open={showAIReview} onClose={() => setShowAIReview(false)} challengeId={draftSave.draftChallengeId} governanceMode={governanceMode} engagementModel={engagementModel} industrySegmentId={industrySegmentId} onReviewComplete={() => setAiReviewCompleted(true)} />}
    </FormProvider>
  );
}
