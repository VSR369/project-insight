/**
 * useCreatorSubmitFlow — submit / QUICK publish-confirm flow for the creator form.
 * Legal v3: SKPA is signed at org registration and Creator role acceptance at
 * role grant, so no legal gate runs here.
 */
import { useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { CreatorFormValues } from '@/components/cogniblend/creator/creatorFormSchema';
import type { GovernanceMode } from '@/lib/governanceMode';
import { buildCreatorSubmitPayload } from '@/services/cogniblend/creator/creatorPayload';
import type { useChallengeSubmit } from '@/hooks/cogniblend/useChallengeSubmit';
import type { useCreatorFileUpload } from '@/hooks/cogniblend/useCreatorFileUpload';
import type { useTierLimitCheck } from '@/hooks/queries/useTierLimitCheck';

interface Params {
  form: UseFormReturn<CreatorFormValues>;
  isQuick: boolean;
  engagementModel: string;
  governanceMode: GovernanceMode;
  industrySegmentId: string;
  orgId: string | undefined;
  userId: string | undefined;
  tierLimit: ReturnType<typeof useTierLimitCheck>['data'];
  submitMutation: ReturnType<typeof useChallengeSubmit>;
  uploadFiles: ReturnType<typeof useCreatorFileUpload>['uploadFiles'];
  referenceUrls: string[];
  attachedFiles: File[];
  draftChallengeId: string | null;
  pendingQuickData: CreatorFormValues | null;
  setPendingQuickData: (v: CreatorFormValues | null) => void;
  setShowQuickConfirm: (v: boolean) => void;
  setShowTierModal: (v: boolean) => void;
  setPublishedResult: (v: { challengeId: string; title: string }) => void;
}

export function useCreatorSubmitFlow({
  form, isQuick, engagementModel, governanceMode, industrySegmentId, orgId, userId, tierLimit,
  submitMutation, uploadFiles, referenceUrls, attachedFiles, draftChallengeId,
  pendingQuickData, setPendingQuickData, setShowQuickConfirm, setShowTierModal, setPublishedResult,
}: Params) {
  const navigate = useNavigate();
  const buildPayload = useCallback((data: CreatorFormValues) => {
    if (!orgId || !userId) throw new Error('Missing org or user context');
    return buildCreatorSubmitPayload(data, {
      orgId: orgId, creatorId: userId, engagementModel, governanceMode, industrySegmentId,
    });
  }, [orgId, userId, engagementModel, governanceMode, industrySegmentId]);

  const executeSubmit = useCallback(async (data: CreatorFormValues) => {
    const loadingToastId = toast.loading(isQuick ? 'Publishing challenge…' : 'Submitting challenge to Curator…');
    try {
      const payload = buildPayload(data);
      const result = await submitMutation.mutateAsync({
        ...payload, referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
        draftChallengeId: draftChallengeId || undefined,
      });
      if (result.challengeId && attachedFiles.length > 0 && orgId && userId) {
        await uploadFiles(attachedFiles, { challengeId: result.challengeId, orgId: orgId, userId });
      }
      toast.dismiss(loadingToastId);
      if (isQuick) {
        toast.success('Challenge published successfully!');
        setPublishedResult({ challengeId: result.challengeId, title: data.title });
      } else {
        toast.success(`Challenge "${data.title}" submitted to Curator for review.`);
        navigate('/cogni/my-challenges');
      }
    } catch (err) {
      toast.dismiss(loadingToastId);
      if (err instanceof Error && !submitMutation.isError) {
        toast.error(err.message || 'Submission failed. Please try again.');
      }
    }
  }, [buildPayload, submitMutation, referenceUrls, draftChallengeId, attachedFiles, orgId, userId, navigate, isQuick, uploadFiles]);

  const handleSubmit = form.handleSubmit(
    async (data) => {
      if (tierLimit && !tierLimit.allowed) { setShowTierModal(true); return; }
      // Legal v3: SKPA is signed at org registration (by Seeker Org Admin),
      // and Creator role acceptance (RA) is collected at role grant via
      // RoleLegalGate. No legal gate is required here at challenge submit.
      // QUICK: open pre-publish confirmation modal first
      if (isQuick) {
        setPendingQuickData(data);
        setShowQuickConfirm(true);
        return;
      }
      await executeSubmit(data);
    },
    (errors) => {
      const firstKey = Object.keys(errors)[0];
      const firstError = errors[firstKey as keyof typeof errors];
      toast.error(`Please fix: ${firstError?.message || firstKey}`);
    },
  );

  const handleQuickConfirm = useCallback(async () => {
    if (!pendingQuickData) return;
    setShowQuickConfirm(false);
    await executeSubmit(pendingQuickData);
    setPendingQuickData(null);
  }, [pendingQuickData, executeSubmit]);

  return { handleSubmit, handleQuickConfirm };
}
