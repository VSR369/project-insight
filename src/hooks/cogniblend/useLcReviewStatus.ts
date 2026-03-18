/**
 * useLcReviewStatus — Query hook fetching LC approval status for all legal
 * documents on a challenge, plus any pending legal_review_requests.
 *
 * Used by LegalDocumentAttachmentPage and GATE-02 UI to display status
 * and determine whether the LC gate blocks curation submission.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_FREQUENT } from '@/config/queryCache';

export interface LcDocStatus {
  documentId: string;
  documentType: string;
  tier: string;
  lcStatus: string | null;
  lcReviewedBy: string | null;
  lcReviewedAt: string | null;
  lcReviewNotes: string | null;
}

export interface LcReviewRequest {
  id: string;
  documentId: string | null;
  requestedBy: string;
  requestedAt: string;
  status: string;
  lcUserId: string | null;
  completedAt: string | null;
  notes: string | null;
  isMandatory: boolean;
}

export interface LcReviewStatusResult {
  docs: LcDocStatus[];
  requests: LcReviewRequest[];
  /** True if all docs are LC-approved (or no docs exist) */
  allApproved: boolean;
  /** True if any doc is pending_review or has a pending request */
  hasPending: boolean;
  /** True if any doc is rejected */
  hasRejected: boolean;
  /** Count of unapproved docs */
  unapprovedCount: number;
}

export function useLcReviewStatus(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['lc-review-status', challengeId],
    queryFn: async (): Promise<LcReviewStatusResult> => {
      if (!challengeId) throw new Error('Challenge ID required');

      // Fetch all legal docs with LC columns
      const { data: docs, error: docsErr } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, tier, lc_status, lc_reviewed_by, lc_reviewed_at, lc_review_notes')
        .eq('challenge_id', challengeId);

      if (docsErr) throw new Error(docsErr.message);

      // Fetch pending review requests
      const { data: requests, error: reqErr } = await supabase
        .from('legal_review_requests' as any)
        .select('id, document_id, requested_by, requested_at, status, lc_user_id, completed_at, notes, is_mandatory')
        .eq('challenge_id', challengeId)
        .order('requested_at', { ascending: false });

      if (reqErr) throw new Error(reqErr.message);

      const mappedDocs: LcDocStatus[] = (docs ?? []).map((d: any) => ({
        documentId: d.id,
        documentType: d.document_type,
        tier: d.tier,
        lcStatus: d.lc_status,
        lcReviewedBy: d.lc_reviewed_by,
        lcReviewedAt: d.lc_reviewed_at,
        lcReviewNotes: d.lc_review_notes,
      }));

      const mappedRequests: LcReviewRequest[] = (requests ?? []).map((r: any) => ({
        id: r.id,
        documentId: r.document_id,
        requestedBy: r.requested_by,
        requestedAt: r.requested_at,
        status: r.status,
        lcUserId: r.lc_user_id,
        completedAt: r.completed_at,
        notes: r.notes,
        isMandatory: r.is_mandatory,
      }));

      const unapprovedCount = mappedDocs.filter(
        (d) => d.lcStatus !== null && d.lcStatus !== 'approved'
      ).length;

      const allApproved = mappedDocs.length === 0 || mappedDocs.every(
        (d) => d.lcStatus === null || d.lcStatus === 'approved'
      );

      const hasPending = mappedDocs.some((d) => d.lcStatus === 'pending_review')
        || mappedRequests.some((r) => r.status === 'pending');

      const hasRejected = mappedDocs.some((d) => d.lcStatus === 'rejected');

      return {
        docs: mappedDocs,
        requests: mappedRequests,
        allApproved,
        hasPending,
        hasRejected,
        unapprovedCount,
      };
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}
