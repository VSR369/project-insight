/**
 * AMChallengeReviewPage — Account Manager review page for curated challenges.
 * Route: /cogni/my-requests/:id/review
 *
 * Shows read-only challenge summary with Approve / Decline actions.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompletePhase } from '@/hooks/cogniblend/useCompletePhase';
import { withCreatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export default function AMChallengeReviewPage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const completePhase = useCompletePhase();

  /* ── Fetch challenge data ──────────────────────────── */

  const { data: challenge, isLoading } = useQuery({
    queryKey: ['am-review-challenge', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, description, problem_statement, scope, deliverables, extended_brief, phase_status, current_phase, operating_model, reward_structure')
        .eq('id', challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
  });

  /* ── Fetch decline history ─────────────────────────── */

  const { data: declineHistory = [] } = useQuery({
    queryKey: ['am-decline-history', challengeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('amendment_records')
        .select('reason, created_at, amendment_number')
        .eq('challenge_id', challengeId!)
        .eq('scope_of_change', 'AM_DECLINED')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!challengeId,
  });

  /* ── Approve mutation ──────────────────────────────── */

  const approveMutation = useMutation({
    mutationFn: async () => {
      // Set phase_status to AM_APPROVED
      const { error: updateError } = await supabase
        .from('challenges')
        .update({ phase_status: 'AM_APPROVED' } as any)
        .eq('id', challengeId!);
      if (updateError) throw new Error(updateError.message);

      // Notify Curator
      const { data: cuRole } = await supabase
        .from('user_challenge_roles')
        .select('user_id')
        .eq('challenge_id', challengeId!)
        .eq('role_code', 'CU')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const curatorId = (cuRole as any)?.user_id;
      if (curatorId) {
        await supabase.from('cogni_notifications').insert({
          user_id: curatorId,
          challenge_id: challengeId!,
          notification_type: 'am_approved',
          title: 'Account Manager approved the challenge',
          message: 'The Account Manager has approved the challenge package. It will now advance to the Innovation Director.',
        });
      }

      // Audit trail
      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId!,
        p_solution_id: '',
        p_action: 'AM_APPROVED',
        p_method: 'UI',
        p_phase_from: 3,
        p_phase_to: 4,
        p_details: {} as unknown as Json,
      });

      // Now advance the phase via complete_phase
      return new Promise<void>((resolve, reject) => {
        completePhase.mutate(
          { challengeId: challengeId!, userId: user?.id ?? '' },
          {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          },
        );
      });
    },
    onSuccess: () => {
      toast.success('Challenge approved and sent to Innovation Director.');
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['am-review-challenge', challengeId] });
      setTimeout(() => navigate('/cogni/my-requests'), 1500);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'am_approve_challenge' });
    },
  });

  /* ── Decline mutation ──────────────────────────────── */

  const declineMutation = useMutation({
    mutationFn: async (reason: string) => {
      // Set phase_status
      const { error: updateError } = await supabase
        .from('challenges')
        .update({ phase_status: 'AM_DECLINED' } as any)
        .eq('id', challengeId!);
      if (updateError) throw new Error(updateError.message);

      // Create amendment record
      const { count } = await supabase
        .from('amendment_records')
        .select('id', { count: 'exact', head: true })
        .eq('challenge_id', challengeId!)
        .eq('scope_of_change', 'AM_DECLINED');
      const nextNumber = (count ?? 0) + 1;

      const amendData = await withCreatedBy({
        challenge_id: challengeId!,
        amendment_number: nextNumber,
        reason,
        initiated_by: 'AM',
        scope_of_change: 'AM_DECLINED',
        status: 'INITIATED',
      });
      await supabase.from('amendment_records').insert(amendData as any);

      // Notify Curator
      const { data: cuRole } = await supabase
        .from('user_challenge_roles')
        .select('user_id')
        .eq('challenge_id', challengeId!)
        .eq('role_code', 'CU')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const curatorId = (cuRole as any)?.user_id;
      if (curatorId) {
        await supabase.from('cogni_notifications').insert({
          user_id: curatorId,
          challenge_id: challengeId!,
          notification_type: 'am_declined',
          title: 'Account Manager declined the challenge',
          message: `The Account Manager has declined the challenge package. Reason: ${reason}`,
        });
      }

      // Audit trail
      await supabase.rpc('log_audit', {
        p_user_id: user?.id ?? '',
        p_challenge_id: challengeId!,
        p_solution_id: '',
        p_action: 'AM_DECLINED',
        p_method: 'UI',
        p_phase_from: 3,
        p_phase_to: 3,
        p_details: { reason, decline_cycle: nextNumber } as unknown as Json,
      });
    },
    onSuccess: () => {
      toast.success('Challenge declined and returned to Curator.');
      setShowDeclineModal(false);
      setDeclineReason('');
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['am-review-challenge', challengeId] });
      setTimeout(() => navigate('/cogni/my-requests'), 1500);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'am_decline_challenge' });
    },
  });

  /* ── Loading / guard ───────────────────────────────── */

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-[960px]">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="space-y-4 max-w-[960px]">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/my-requests')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Card className="border-destructive">
          <CardContent className="p-8 text-center text-sm text-destructive">
            Challenge not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  const extBrief = (challenge.extended_brief as any) ?? {};
  const isApprovalPending = challenge.phase_status === 'AM_APPROVAL_PENDING';
  const isAlreadyActioned = challenge.phase_status === 'AM_APPROVED' || challenge.phase_status === 'AM_DECLINED';
  const rewardStructure = (challenge.reward_structure as any) ?? {};
  const deliverables = Array.isArray(challenge.deliverables) ? challenge.deliverables : [];

  return (
    <div className="space-y-6 max-w-[960px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/my-requests')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-[22px] font-bold text-primary">Review Challenge Package</h1>
        {isApprovalPending && (
          <Badge className="bg-amber-100 text-amber-700 text-[10px]">Awaiting Your Approval</Badge>
        )}
        {challenge.phase_status === 'AM_APPROVED' && (
          <Badge className="bg-green-100 text-green-700 text-[10px]">Approved</Badge>
        )}
        {challenge.phase_status === 'AM_DECLINED' && (
          <Badge className="bg-red-100 text-red-700 text-[10px]">Declined</Badge>
        )}
      </div>

      {/* Decline History */}
      {declineHistory.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Previous Decline History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {declineHistory.map((d: any, i: number) => (
              <div key={i} className="text-sm border-l-2 border-amber-300 pl-3 py-1">
                <p className="text-foreground">{d.reason}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cycle {d.amendment_number} · {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Challenge Summary */}
      <Card className="rounded-xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{challenge.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {challenge.problem_statement && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Problem Statement</Label>
              <p className="mt-1 text-sm text-foreground leading-relaxed">{challenge.problem_statement}</p>
            </div>
          )}
          {challenge.scope && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scope</Label>
              <p className="mt-1 text-sm text-foreground leading-relaxed">{challenge.scope}</p>
            </div>
          )}
          {challenge.description && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</Label>
              <p className="mt-1 text-sm text-foreground leading-relaxed">{challenge.description}</p>
            </div>
          )}
          {deliverables.length > 0 && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deliverables</Label>
              <ul className="mt-1 list-disc list-inside text-sm text-foreground space-y-1">
                {deliverables.map((d: any, i: number) => (
                  <li key={i}>{typeof d === 'string' ? d : d?.description ?? JSON.stringify(d)}</li>
                ))}
              </ul>
            </div>
          )}
          {rewardStructure.total_prize && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reward</Label>
              <p className="mt-1 text-sm text-foreground">{rewardStructure.currency ?? 'USD'} {Number(rewardStructure.total_prize).toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original Brief from AM */}
      {(extBrief.budget || extBrief.timeline || extBrief.expectations) && (
        <Card className="rounded-xl border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Your Original Brief
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {extBrief.budget && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Budget</Label>
                <p className="mt-1 text-sm text-foreground">{extBrief.budget}</p>
              </div>
            )}
            {extBrief.timeline && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timeline</Label>
                <p className="mt-1 text-sm text-foreground">{extBrief.timeline}</p>
              </div>
            )}
            {extBrief.expectations && (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expectations</Label>
                <p className="mt-1 text-sm text-foreground">{extBrief.expectations}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {isApprovalPending && (
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col lg:flex-row gap-3">
              <Button
                className="flex-1"
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || completePhase.isPending}
              >
                {(approveMutation.isPending || completePhase.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                )}
                Approve & Send to Innovation Director
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeclineModal(true)}
                disabled={approveMutation.isPending || declineMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Decline & Return to Curator
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAlreadyActioned && (
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5 text-center text-sm text-muted-foreground">
            This challenge has already been {challenge.phase_status === 'AM_APPROVED' ? 'approved' : 'declined'}.
          </CardContent>
        </Card>
      )}

      {/* Decline Modal */}
      <Dialog open={showDeclineModal} onOpenChange={setShowDeclineModal}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Decline Challenge Package</DialogTitle>
            <DialogDescription>
              Provide feedback for the Curator on what needs to change.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
            <div>
              <Label htmlFor="decline-reason">Reason for Decline *</Label>
              <Textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Describe what doesn't meet expectations (min 10 characters)..."
                className="mt-2"
                rows={5}
              />
              {declineReason.trim().length > 0 && declineReason.trim().length < 10 && (
                <p className="text-xs text-destructive mt-1">
                  Reason must be at least 10 characters.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => declineMutation.mutate(declineReason.trim())}
              disabled={declineReason.trim().length < 10 || declineMutation.isPending}
            >
              {declineMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
