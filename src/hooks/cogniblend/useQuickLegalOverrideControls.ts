/**
 * useQuickLegalOverrideControls — QUICK-mode legal override toggle, upload and
 * explicit removal for the creator form. Hydrates the toggle once from the
 * saved override; later refetches never snap the creator's choice back.
 */
import { useCallback, useEffect, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { CreatorFormValues } from '@/components/cogniblend/creator/creatorFormSchema';
import type { useDeleteQuickLegalOverride, useQuickLegalOverride, useUploadQuickLegalOverride } from '@/hooks/queries/useQuickLegalOverride';

interface Params {
  form: UseFormReturn<CreatorFormValues>;
  isQuick: boolean;
  quickLegalOverride: ReturnType<typeof useQuickLegalOverride>['data'];
  userId: string | undefined;
  saveDraft: () => Promise<string | null | undefined>;
  uploadQuickOverride: ReturnType<typeof useUploadQuickLegalOverride>;
  deleteQuickOverride: ReturnType<typeof useDeleteQuickLegalOverride>;
}

export function useQuickLegalOverrideControls({ form, isQuick, quickLegalOverride, userId, saveDraft, uploadQuickOverride, deleteQuickOverride }: Params) {
  // One-time hydration: initialize the toggle from the saved override state
  // when the draft first loads. After that, the creator's live selection wins
  // and is NOT snapped back by query refetches.
  const [hasHydratedQuickMode, setHasHydratedQuickMode] = useState(false);
  useEffect(() => {
    if (!isQuick || hasHydratedQuickMode) return;
    if (quickLegalOverride === undefined) return; // wait until query resolves
    form.setValue(
      'quick_legal_override_mode',
      quickLegalOverride ? 'REPLACE_DEFAULT' : 'KEEP_DEFAULT',
      { shouldDirty: false },
    );
    setHasHydratedQuickMode(true);
  }, [form, isQuick, quickLegalOverride, hasHydratedQuickMode]);

  // Non-destructive toggle: only updates form state. The saved replacement is
  // preserved when switching back to KEEP_DEFAULT — deletion is explicit only.
  const handleQuickLegalOverrideChange = useCallback(async (nextMode: 'KEEP_DEFAULT' | 'REPLACE_DEFAULT') => {
    form.setValue('quick_legal_override_mode', nextMode, { shouldDirty: true });
  }, [form]);

  // Explicit destructive remove: deletes the saved override row + storage object,
  // then resets the toggle to KEEP_DEFAULT.
  const handleQuickLegalOverrideRemove = useCallback(async () => {
    if (!quickLegalOverride) {
      form.setValue('quick_legal_override_mode', 'KEEP_DEFAULT', { shouldDirty: true });
      return;
    }
    await deleteQuickOverride.mutateAsync({
      challengeId: quickLegalOverride.challenge_id,
      docId: quickLegalOverride.id,
      storagePath: quickLegalOverride.lc_review_notes,
    });
    form.setValue('quick_legal_override_mode', 'KEEP_DEFAULT', { shouldDirty: true });
  }, [deleteQuickOverride, form, quickLegalOverride]);

  const handleQuickLegalOverrideUpload = useCallback(async (file: File) => {
    const challengeId = await saveDraft();
    if (!challengeId || !userId) return;

    form.setValue('quick_legal_override_mode', 'REPLACE_DEFAULT', { shouldDirty: true });
    await uploadQuickOverride.mutateAsync({
      challengeId,
      userId,
      file,
    });
  }, [saveDraft, form, uploadQuickOverride, userId]);

  return { handleQuickLegalOverrideChange, handleQuickLegalOverrideRemove, handleQuickLegalOverrideUpload };
}
