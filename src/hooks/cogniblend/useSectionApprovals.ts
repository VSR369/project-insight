/**
 * useSectionApprovals — Hook for section approval/undo operations.
 * Extracted from CurationReviewPage for maintainability (Prompt 4.5).
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SectionAction {
  id: string;
  section_key: string;
  action_type: string;
  status: string;
  [key: string]: unknown;
}

interface AiReview {
  section_key: string;
  [key: string]: unknown;
}

interface UseSectionApprovalsOptions {
  challengeId: string | undefined;
  userId: string | undefined;
  aiReviews: AiReview[];
  sectionActions: SectionAction[];
}

export function useSectionApprovals({
  challengeId,
  userId,
  aiReviews,
  sectionActions,
}: UseSectionApprovalsOptions) {
  const queryClient = useQueryClient();

  /** Approve a locked section (Legal/Escrow) — with audit metadata */
  const handleApproveLockedSection = useCallback(async (sectionKey: string) => {
    if (!userId || !challengeId) return;

    const aiReviewWasRun = aiReviews.some(r => r.section_key === sectionKey);
    const commentsSentToCoordinator = sectionActions.some(
      a => a.section_key === sectionKey && a.action_type === "modification_request"
    );

    const { error } = await supabase
      .from("curator_section_actions" as any)
      .insert({
        challenge_id: challengeId,
        section_key: sectionKey,
        action_type: "approval",
        status: "approved",
        created_by: userId,
        comment_html: JSON.stringify({
          ai_review_was_run: aiReviewWasRun,
          comments_sent_to_coordinator: commentsSentToCoordinator,
        }),
      });
    if (error) {
      toast.error(`Failed to approve: ${error.message}`);
    } else {
      toast.success("Section accepted");
      queryClient.invalidateQueries({ queryKey: ["curator-section-actions", challengeId] });
    }
  }, [userId, challengeId, queryClient, aiReviews, sectionActions]);

  /** Undo acceptance of a locked section */
  const handleUndoApproval = useCallback(async (sectionKey: string) => {
    if (!challengeId) return;
    const approvalRecord = sectionActions.find(
      a => a.section_key === sectionKey && a.action_type === "approval" && a.status === "approved"
    );
    if (!approvalRecord) return;

    const { error } = await supabase
      .from("curator_section_actions" as any)
      .delete()
      .eq("id", approvalRecord.id);
    if (error) {
      toast.error(`Failed to undo: ${error.message}`);
    } else {
      toast.success("Acceptance undone");
      queryClient.invalidateQueries({ queryKey: ["curator-section-actions", challengeId] });
    }
  }, [challengeId, queryClient, sectionActions]);

  return { handleApproveLockedSection, handleUndoApproval };
}
