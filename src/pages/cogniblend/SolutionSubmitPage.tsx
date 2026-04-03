/**
 * SolutionSubmitPage — /cogni/challenges/:id/submit
 * Thin orchestrator delegating to gate screens and form sections.
 */

import { resolveGovernanceMode, isQuickMode, isStructuredOrAbove } from '@/lib/governanceMode';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useAuth } from '@/hooks/useAuth';
import { useSolverEnrollmentStatus } from '@/hooks/cogniblend/useSolverEnrollment';
import {
  useTier2LegalStatus, useSolverSolution, useSaveSolutionDraft, useSubmitSolution,
} from '@/hooks/cogniblend/useSolutionSubmission';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { useWithdrawalContext, useWithdrawSolution } from '@/hooks/cogniblend/useWithdrawSolution';
import { useLegalReacceptanceStatus } from '@/hooks/cogniblend/useLegalReacceptance';
import { useLegalGateAction } from '@/hooks/legal/useLegalGateAction';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { CACHE_STANDARD } from '@/config/queryCache';
import { Form } from '@/components/ui/form';
import { toast } from 'sonner';

import { abstractFormSchema, TIER_2_DOCUMENTS, MAX_TOTAL_FILE_SIZE } from './SolutionSubmitConstants';
import type { AbstractFormValues } from './SolutionSubmitConstants';
import {
  SolutionSubmitLoading, EnrollmentRequiredScreen, WithdrawnScreen,
  ReacceptanceScreen, AlreadySubmittedScreen,
} from './SolutionSubmitGateScreens';
import {
  SolutionSubmitHeader, LegalGateBanner, TemplateDownloadBanner,
  SolutionFormFields, SolutionFormActions, LegalAcceptanceModal,
} from './SolutionSubmitFormSections';

export default function SolutionSubmitPage() {
  // ═══ SECTION 1: useState ═══
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [currentLegalIdx, setCurrentLegalIdx] = useState(0);
  const [legalAccepted, setLegalAccepted] = useState<Record<string, boolean>>({});
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [reacceptModalOpen, setReacceptModalOpen] = useState(false);

  // ═══ SECTION 2: Context and hooks ═══
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  // ═══ SECTION 3: Form ═══
  const form = useForm<AbstractFormValues>({
    resolver: zodResolver(abstractFormSchema),
    defaultValues: { abstractText: '', methodology: '', timeline: '', experience: '', aiUsageDeclaration: '' },
  });
  const { clearPersistedData: clearSolutionPersistence } = useFormPersistence(
    `cogni_solution_submit_${challengeId ?? 'unknown'}`, form,
  );

  // ═══ SECTION 4: Queries & Mutations ═══
  const { data: enrollment, isLoading: enrollmentLoading } = useSolverEnrollmentStatus(challengeId, userId);
  const { data: tier2Status, isLoading: tier2Loading } = useTier2LegalStatus(challengeId, userId);
  const { data: existingSolution, isLoading: solutionLoading } = useSolverSolution(challengeId, userId);
  const { data: challenge, isLoading: challengeLoading } = useQuery({
    queryKey: ['challenge-for-submit', challengeId],
    queryFn: async () => {
      if (!challengeId) return null;
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, phase_schedule, operating_model, governance_profile, deliverables, submission_deadline, submission_template_url')
        .eq('id', challengeId).single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const saveDraftMutation = useSaveSolutionDraft();
  const submitMutation = useSubmitSolution();
  const legalMutation = useRecordLegalAcceptance();
  const { data: withdrawalCtx } = useWithdrawalContext(challengeId, existingSolution?.id);
  const withdrawMutation = useWithdrawSolution();
  const { data: reacceptStatus } = useLegalReacceptanceStatus(challengeId, userId);

  // Legal gate for ABSTRACT_SUBMIT trigger (PSA + IPAA)
  const abstractGate = useLegalGateAction({
    triggerEvent: 'ABSTRACT_SUBMIT',
    challengeId,
    userRole: 'SOLVER',
  });

  // ═══ SECTION 5: useEffect ═══
  useEffect(() => {
    if (existingSolution) {
      form.reset({
        abstractText: existingSolution.abstract_text ?? '',
        methodology: existingSolution.methodology ?? '',
        timeline: existingSolution.timeline ?? '',
        experience: existingSolution.experience ?? '',
        aiUsageDeclaration: existingSolution.ai_usage_declaration ?? '',
      });
    }
  }, [existingSolution, form]);

  useEffect(() => {
    if (reacceptStatus?.hasPending) setReacceptModalOpen(true);
  }, [reacceptStatus?.hasPending]);

  // ═══ SECTION 6: Derived ═══
  const isLoading = enrollmentLoading || tier2Loading || solutionLoading || challengeLoading;
  const isEnrolled = enrollment?.status === 'APPROVED';
  const isAlreadySubmitted = existingSolution?.phase_status === 'ACTIVE' && !!existingSolution?.submitted_at;
  const isWithdrawn = existingSolution?.phase_status === 'TERMINAL' || existingSolution?.selection_status === 'WITHDRAWN';
  const _govMode = resolveGovernanceMode(challenge?.governance_profile);
  const isQuick = isQuickMode(_govMode);
  const isEnterprise = isStructuredOrAbove(_govMode);
  const needsLegalAcceptance = tier2Status && !tier2Status.allAccepted;
  const needsReacceptance = reacceptStatus?.hasPending ?? false;
  const missingDocs = useMemo(
    () => TIER_2_DOCUMENTS.filter(d => tier2Status?.missing?.includes(d.type)),
    [tier2Status],
  );
  const totalFileSize = attachedFiles.reduce((sum, f) => sum + f.size, 0);
  const fileSizeExceeded = totalFileSize > MAX_TOTAL_FILE_SIZE;

  // ═══ Conditional returns ═══
  if (isLoading) return <SolutionSubmitLoading />;
  if (!isEnrolled) return <EnrollmentRequiredScreen challengeId={challengeId} />;
  if (isWithdrawn) return <WithdrawnScreen challengeId={challengeId} />;
  if (needsReacceptance && reacceptStatus?.record) {
    return (
      <ReacceptanceScreen
        challengeId={challengeId!} userId={userId ?? ''} record={reacceptStatus.record}
        open={reacceptModalOpen} onOpenChange={setReacceptModalOpen}
      />
    );
  }
  if (isAlreadySubmitted) {
    return (
      <AlreadySubmittedScreen
        challengeId={challengeId!} userId={userId ?? ''} existingSolution={existingSolution}
        isEnterprise={isEnterprise} withdrawalCtx={withdrawalCtx} withdrawMutation={withdrawMutation}
      />
    );
  }

  // ═══ SECTION 7: Handlers ═══
  const handleOpenLegalGate = () => {
    if (needsLegalAcceptance && missingDocs.length > 0) {
      setCurrentLegalIdx(0); setLegalAccepted({}); setLegalModalOpen(true);
    }
  };

  const handleLegalDocAccept = async () => {
    const currentDoc = missingDocs[currentLegalIdx];
    if (!currentDoc || !userId || !challengeId) return;
    try {
      await legalMutation.mutateAsync({
        challengeId, userId, documentType: currentDoc.type,
        documentName: currentDoc.name, tier: 'TIER_2', phaseTriggered: 7, scrollConfirmed: true,
      });
      const nextIdx = currentLegalIdx + 1;
      if (nextIdx < missingDocs.length) {
        setCurrentLegalIdx(nextIdx);
        setLegalAccepted(prev => ({ ...prev, [currentDoc.type]: true }));
      } else {
        setLegalModalOpen(false);
        toast.success('All legal documents accepted. You may now submit.');
      }
    } catch { /* Error handled by mutation */ }
  };

  const handleSaveDraft = () => {
    const values = form.getValues();
    saveDraftMutation.mutate({ existingId: existingSolution?.id, challengeId: challengeId!, providerId: userId!, ...values });
  };

  const handleSubmit = async (values: AbstractFormValues) => {
    if (fileSizeExceeded) { toast.error('Total file size exceeds 50MB limit.'); return; }
    submitMutation.mutate({
      existingId: existingSolution?.id, challengeId: challengeId!, providerId: userId!,
      abstractText: values.abstractText, methodology: values.methodology,
      timeline: values.timeline, experience: values.experience, aiUsageDeclaration: values.aiUsageDeclaration,
    }, { onSuccess: () => clearSolutionPersistence() });
  };

  // ═══ SECTION 8: Render ═══
  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-6 space-y-6">
      <SolutionSubmitHeader
        challengeTitle={challenge?.title ?? 'Challenge'}
        onBack={() => navigate(`/cogni/challenges/${challengeId}/view`)}
      />

      {needsLegalAcceptance && <LegalGateBanner missingCount={missingDocs.length} onReview={handleOpenLegalGate} />}
      {(challenge as any)?.submission_template_url && <TemplateDownloadBanner url={(challenge as any).submission_template_url} />}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <SolutionFormFields
            form={form} attachedFiles={attachedFiles} onFilesChange={setAttachedFiles}
            isQuick={isQuick} isEnterprise={isEnterprise}
          />
          <SolutionFormActions
            onSaveDraft={handleSaveDraft} isSaving={saveDraftMutation.isPending}
            isSubmitting={submitMutation.isPending} needsLegalAcceptance={!!needsLegalAcceptance}
            fileSizeExceeded={fileSizeExceeded} isQuick={isQuick}
          />
        </form>
      </Form>

      <LegalAcceptanceModal
        open={legalModalOpen} onOpenChange={setLegalModalOpen}
        currentDoc={missingDocs[currentLegalIdx]} currentIdx={currentLegalIdx}
        totalDocs={missingDocs.length} accepted={legalAccepted}
        onAcceptedChange={(type, v) => setLegalAccepted(prev => ({ ...prev, [type]: v }))}
        onAccept={handleLegalDocAccept} isPending={legalMutation.isPending}
      />
    </div>
  );
}
