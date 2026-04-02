/**
 * useApprovalTiers — Computes tiered approval summaries for Creator review.
 * Groups sections into 3 approval tiers with content + approval status.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { APPROVAL_TIERS, type ApprovalTier } from '@/lib/cogniblend/approvalTiers';

interface SectionApproval {
  section_key: string;
  status: string;
  comment: string | null;
}

export interface TierSection {
  key: string;
  label: string;
  curatorContent: unknown;
  creatorContent: unknown;
  approvalStatus: 'pending' | 'approved' | 'change_requested' | null;
}

export interface TierSummary {
  tier: ApprovalTier;
  sections: TierSection[];
  approvedCount: number;
  totalCount: number;
}

/** Fetch challenge_section_approvals for the Creator-side approval flow */
function useCreatorSectionApprovals(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['creator-section-approvals', challengeId],
    queryFn: async () => {
      if (!challengeId) return [];
      const { data, error } = await supabase
        .from('challenge_section_approvals')
        .select('section_key, status, comment')
        .eq('challenge_id', challengeId);
      if (error) throw error;
      return (data ?? []) as SectionApproval[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

export function useApprovalTiers(
  challengeId: string | undefined,
  challengeData: Record<string, unknown> | null,
  creatorSnapshot: Record<string, unknown> | null,
  sectionLabels: Record<string, string>,
) {
  const { data: approvals = [] } = useCreatorSectionApprovals(challengeId);

  return useMemo((): TierSummary[] => {
    if (!challengeData) return [];

    const extBrief = (challengeData.extended_brief as Record<string, unknown>) ?? {};

    return APPROVAL_TIERS.map((tier) => {
      const sections = tier.sections
        .map((key) => {
          const content = challengeData[key] ?? extBrief[key] ?? null;
          const approval = approvals.find((a) => a.section_key === key);
          return {
            key,
            label: sectionLabels[key] || key,
            curatorContent: content,
            creatorContent: creatorSnapshot?.[key] ?? null,
            approvalStatus: (approval?.status as TierSection['approvalStatus']) ?? null,
          };
        })
        .filter((s) => s.curatorContent != null);

      return {
        tier,
        sections,
        approvedCount: sections.filter((s) => s.approvalStatus === 'approved').length,
        totalCount: sections.length,
      };
    });
  }, [challengeData, creatorSnapshot, approvals, sectionLabels]);
}
