/**
 * useFullSolutionUpload — Hooks for Enterprise Stage 2 full solution upload.
 * - useShortlistStatus: Check if solver's abstract was shortlisted
 * - useUploadSolutionFile: Upload deliverable files to Supabase Storage
 * - useMarkFullSolutionUploaded: Mark solution as fully uploaded
 * - useSendShortlistNotification: Insert notification on shortlist
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { withUpdatedBy } from '@/lib/auditFields';
import { CACHE_STANDARD } from '@/config/queryCache';
import { sanitizeFileName } from '@/lib/sanitizeFileName';

/* ─── Types ──────────────────────────────────────────────── */

export interface DeliverableUpload {
  deliverableName: string;
  file: File | null;
  uploadedUrl: string | null;
  isUploading: boolean;
}

export interface ShortlistStatus {
  isShortlisted: boolean;
  solutionId: string | null;
  selectionStatus: string | null;
  submittedAt: string | null;
  fullSolutionUrl: string | null;
  phaseStatus: string | null;
}

/* ─── useShortlistStatus ─────────────────────────────────── */

export function useShortlistStatus(challengeId: string | undefined, providerId: string | undefined) {
  return useQuery({
    queryKey: ['shortlist-status', challengeId, providerId],
    queryFn: async (): Promise<ShortlistStatus> => {
      if (!challengeId || !providerId) {
        return { isShortlisted: false, solutionId: null, selectionStatus: null, submittedAt: null, fullSolutionUrl: null, phaseStatus: null };
      }

      const { data, error } = await supabase
        .from('solutions')
        .select('id, selection_status, submitted_at, full_solution_url, phase_status')
        .eq('challenge_id', challengeId)
        .eq('provider_id', providerId)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (!data) {
        return { isShortlisted: false, solutionId: null, selectionStatus: null, submittedAt: null, fullSolutionUrl: null, phaseStatus: null };
      }

      return {
        isShortlisted: data.selection_status === 'SHORTLISTED',
        solutionId: data.id,
        selectionStatus: data.selection_status,
        submittedAt: data.submitted_at,
        fullSolutionUrl: data.full_solution_url,
        phaseStatus: data.phase_status,
      };
    },
    enabled: !!challengeId && !!providerId,
    ...CACHE_STANDARD,
  });
}

/* ─── useUploadSolutionFile ──────────────────────────────── */

export function useUploadSolutionFile() {
  return useMutation({
    mutationFn: async ({
      solutionId,
      userId,
      deliverableName,
      file,
    }: {
      solutionId: string;
      userId: string;
      deliverableName: string;
      file: File;
    }) => {
      const safeName = sanitizeFileName(file.name);
      const safeDeliverable = sanitizeFileName(deliverableName);
      const path = `${userId}/solutions/${solutionId}/${safeDeliverable}_${Date.now()}_${safeName}`;

      const { data, error } = await supabase.storage
        .from('solution-files')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw new Error(`Upload failed: ${error.message}`);

      const { data: urlData } = supabase.storage
        .from('solution-files')
        .getPublicUrl(data.path);

      return {
        deliverableName,
        url: urlData.publicUrl,
        path: data.path,
        fileName: file.name,
        fileSize: file.size,
      };
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'upload_solution_file' });
    },
  });
}

/* ─── useMarkFullSolutionUploaded ────────────────────────── */

export function useMarkFullSolutionUploaded() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      solutionId,
      challengeId,
      uploadedFiles,
    }: {
      solutionId: string;
      challengeId: string;
      uploadedFiles: Array<{ deliverableName: string; url: string; fileName: string; fileSize: number }>;
    }) => {
      const withAudit = await withUpdatedBy({
        full_solution_url: JSON.stringify(uploadedFiles),
        phase_status: 'FULL_UPLOADED',
        updated_at: new Date().toISOString(),
      });

      const { data, error } = await supabase
        .from('solutions')
        .update(withAudit as any)
        .eq('id', solutionId)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shortlist-status', variables.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['solver-solution', variables.challengeId] });
      toast.success('Full solution uploaded successfully.');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'mark_full_solution_uploaded' });
    },
  });
}

/* ─── useSendShortlistNotification ───────────────────────── */

export function useSendShortlistNotification() {
  return useMutation({
    mutationFn: async ({
      userId,
      challengeId,
      challengeTitle,
    }: {
      userId: string;
      challengeId: string;
      challengeTitle: string;
    }) => {
      const { error } = await supabase.from('cogni_notifications').insert({
        user_id: userId,
        challenge_id: challengeId,
        notification_type: 'SHORTLISTED',
        title: 'Congratulations! Your abstract has been shortlisted.',
        message: `Your abstract for "${challengeTitle}" has been shortlisted. You may now upload your full solution.`,
      });

      if (error) throw new Error(error.message);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'send_shortlist_notification' });
    },
  });
}
