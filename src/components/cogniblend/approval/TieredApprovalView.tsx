/**
 * TieredApprovalView — Main orchestrator for Creator tiered approval experience.
 * Composes ApprovalTierGroup + ApprovalProgressBar with mutation logic.
 */

import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';
import { useApprovalTiers } from '@/hooks/cogniblend/useApprovalTiers';
import { ApprovalTierGroup } from './ApprovalTierGroup';
import { ApprovalProgressBar } from './ApprovalProgressBar';

interface TieredApprovalViewProps {
  challengeId: string;
  challengeData: Record<string, unknown>;
  creatorSnapshot: Record<string, unknown> | null;
  governanceMode: string;
  sectionLabels: Record<string, string>;
}

export function TieredApprovalView({
  challengeId, challengeData, creatorSnapshot, governanceMode, sectionLabels,
}: TieredApprovalViewProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isControlled = governanceMode === 'controlled';
  const tiers = useApprovalTiers(challengeId, challengeData, creatorSnapshot, sectionLabels);

  const approveMutation = useMutation({
    mutationFn: async (sectionKey: string) => {
      const { error } = await supabase
        .from('challenge_section_approvals')
        .upsert({
          challenge_id: challengeId,
          section_key: sectionKey,
          status: 'approved',
          reviewer_id: user?.id,
        }, { onConflict: 'challenge_id,section_key' } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-section-approvals', challengeId] });
    },
    onError: () => toast.error('Failed to approve section'),
  });

  const requestChangeMutation = useMutation({
    mutationFn: async ({ sectionKey, comment }: { sectionKey: string; comment: string }) => {
      const { error } = await supabase
        .from('challenge_section_approvals')
        .upsert({
          challenge_id: challengeId,
          section_key: sectionKey,
          status: 'change_requested',
          comment,
          reviewer_id: user?.id,
        }, { onConflict: 'challenge_id,section_key' } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-section-approvals', challengeId] });
      toast.success('Change request submitted');
    },
    onError: () => toast.error('Failed to submit change request'),
  });

  const totals = useMemo(() => {
    const allSections = tiers.flatMap((t) => t.sections);
    return {
      approved: allSections.filter((s) => s.approvalStatus === 'approved').length,
      total: allSections.length,
    };
  }, [tiers]);

  const handleApproveAll = useCallback(async () => {
    const unapproved = tiers.flatMap((t) => t.sections).filter((s) => s.approvalStatus !== 'approved');
    for (const s of unapproved) {
      await approveMutation.mutateAsync(s.key);
    }
    toast.success(`Approved ${unapproved.length} remaining sections`);
  }, [tiers, approveMutation]);

  const handleSubmitFeedback = useCallback(async () => {
    const allApproved = totals.approved === totals.total;
    if (allApproved) {
      // Advance phase - trigger the parent's approve mutation
      const { error } = await supabase
        .from('challenges')
        .update({ phase_status: 'COMPLETED' } as any)
        .eq('id', challengeId);
      if (error) {
        toast.error('Failed to approve challenge');
      } else {
        queryClient.invalidateQueries({ queryKey: ['challenge'] });
        toast.success('Challenge approved for publication!');
      }
    } else {
      // Return to curator with feedback
      const { error } = await supabase
        .from('challenges')
        .update({ phase_status: 'RETURNED' } as any)
        .eq('id', challengeId);
      if (error) {
        toast.error('Failed to return challenge');
      } else {
        queryClient.invalidateQueries({ queryKey: ['challenge'] });
        toast.success('Feedback submitted — returned to Curator');
      }
    }
  }, [challengeId, totals, queryClient]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Review Your Challenge
        </h2>
        <p className="text-sm text-muted-foreground">
          Review each section below. Approve sections you're happy with, or request changes.
        </p>
      </div>

      {tiers.map((t) => (
        <ApprovalTierGroup
          key={t.tier.id}
          tier={t.tier}
          sections={t.sections}
          approvedCount={t.approvedCount}
          totalCount={t.totalCount}
          onApprove={(key) => approveMutation.mutate(key)}
          onRequestChange={(key, comment) => requestChangeMutation.mutate({ sectionKey: key, comment })}
          isControlled={isControlled}
          defaultExpanded={t.tier.defaultExpanded}
        />
      ))}

      <ApprovalProgressBar
        totalApproved={totals.approved}
        totalSections={totals.total}
        onApproveAll={handleApproveAll}
        onSubmitFeedback={handleSubmitFeedback}
        isControlled={isControlled}
      />
    </div>
  );
}
