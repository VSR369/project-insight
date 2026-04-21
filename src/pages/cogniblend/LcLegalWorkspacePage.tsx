/**
 * LcLegalWorkspacePage — Unified Pass 3 Legal Coordinator workspace.
 * Route: /cogni/challenges/:id/lc-legal
 *
 * Thin orchestrator. Source-doc upload → Pass 3 → Attached docs → Submit.
 */
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Loader2, Send, Shield } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { usePwaStatus } from '@/hooks/cogniblend/usePwaStatus';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { PwaAcceptanceGate } from '@/components/cogniblend/workforce/PwaAcceptanceGate';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { LcReturnToCurator } from '@/components/cogniblend/lc/LcReturnToCurator';
import { LcApproveAction } from '@/components/cogniblend/lc/LcApproveAction';
import { LcFullChallengePreview } from '@/components/cogniblend/lc/LcFullChallengePreview';
import { LcAttachedDocsCard } from '@/components/cogniblend/lc/LcAttachedDocsCard';
import { LcPass3ReviewPanel } from '@/components/cogniblend/lc/LcPass3ReviewPanel';
import { LcSourceDocUpload } from '@/components/cogniblend/lc/LcSourceDocUpload';
import { LcLegalStepIndicator } from '@/components/cogniblend/lc/LcLegalStepIndicator';

import {
  useAttachedLegalDocs,
  useChallengeForLC,
} from '@/hooks/cogniblend/useLcLegalData';
import { useLcLegalActions } from '@/hooks/cogniblend/useLcLegalActions';
import { useLcPass3Review } from '@/hooks/cogniblend/useLcPass3Review';

export default function LcLegalWorkspacePage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: roles } = useUserChallengeRoles(user?.id, challengeId);
  const { data: challenge, isLoading: challengeLoading } = useChallengeForLC(challengeId);
  const { data: attachedDocs, isLoading: attachedLoading } = useAttachedLegalDocs(challengeId);

  const opModel = challenge?.operating_model ?? 'IP';
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(
    opModel === 'MP' ? user?.id : undefined,
  );
  const [pwaAccepted, setPwaAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [gateFailures, setGateFailures] = useState<string[]>([]);

  const actions = useLcLegalActions({
    challengeId,
    userId: user?.id,
  });

  const pass3 = useLcPass3Review(challengeId);
  // Derive 1/2/3 step from Pass 3 status. Step 1 = nothing generated yet,
  // Step 2 = draft exists (ai_suggested OR organized), Step 3 = LC accepted.
  const currentStep: 1 | 2 | 3 = pass3.isPass3Accepted
    ? 3
    : pass3.pass3Status === 'completed' || pass3.pass3Status === 'organized'
      ? 2
      : 1;

  const isLC = roles?.includes('LC') ?? false;
  const hasAccess = isLC || (roles?.includes('CR') ?? false);

  const handleSubmitToCuration = async () => {
    if (!challengeId || !user?.id) return;
    setSubmitting(true);
    setGateFailures([]);
    try {
      const { data: gateResult } = await supabase.rpc('validate_gate_02', {
        p_challenge_id: challengeId,
      });
      const gate = gateResult as unknown as { passed: boolean; failures: string[] } | null;
      if (!gate?.passed) {
        const failures = gate?.failures ?? ['Unknown validation failure'];
        setGateFailures(failures);
        toast.error(`Cannot advance: ${failures.join(', ')}`);
        return;
      }

      const { data: reviewResult, error } = await supabase.rpc('complete_legal_review', {
        p_challenge_id: challengeId,
        p_user_id: user.id,
      });
      if (error) throw new Error(error.message);

      const result = reviewResult as unknown as {
        success: boolean;
        phase_advanced: boolean;
        current_phase: number;
        message?: string;
        awaiting?: string;
        error?: string;
      };
      if (!result?.success) throw new Error(result?.error ?? 'Legal review RPC failed');

      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['curation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-preview', challengeId] });

      const msg = result.awaiting === 'creator_approval'
        ? 'Legal review complete — Creator approval requested'
        : result.phase_advanced
          ? 'Legal review complete — challenge advanced to next phase'
          : 'Legal review complete — waiting for financial compliance';
      toast.success(msg);
      if (result.phase_advanced) navigate('/cogni/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (challengeLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (opModel === 'MP' && !hasPwa && !pwaAccepted && !pwaLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PwaAcceptanceGate userId={user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need the Legal Coordinator (LC) role to access this workspace.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STRUCTURED governance is handled by the Curator; QUICK has no LC step.
  const challengeRecord = challenge as unknown as Record<string, unknown> | null;
  const govProfile = ((challengeRecord?.governance_mode_override
    ?? challengeRecord?.governance_profile
    ?? '') as string);
  const govUpper = govProfile.toUpperCase();
  if (govUpper === 'STRUCTURED' || govUpper === 'QUICK') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-semibold text-foreground">
              Not applicable for {govUpper.charAt(0) + govUpper.slice(1).toLowerCase()} governance
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              The Curator handles legal compliance for {govUpper.toLowerCase()} challenges.
              Legal Coordinator review is only required for Controlled or Enterprise governance modes.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/lc-queue')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to LC Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAccepted = attachedDocs?.length ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/cogni/lc-queue" className="text-muted-foreground hover:text-foreground" aria-label="Back to LC queue">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Legal Coordinator Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Challenge:{' '}
            <span className="font-medium text-foreground">{challenge?.title ?? 'Untitled'}</span>
          </p>
        </div>
      </div>

      {challenge?.lc_compliance_complete && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Legal Review Complete — Read Only</AlertTitle>
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            You have submitted your legal review for this challenge. No further edits are required from you.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-card p-3">
        <LcLegalStepIndicator currentStep={currentStep} />
      </div>

      <WorkflowProgressBanner step={3} />

      <LcFullChallengePreview challengeId={challengeId!} />

      {isLC && !challenge?.lc_compliance_complete && (
        <LcSourceDocUpload challengeId={challengeId!} sourceOrigin="lc" />
      )}

      {isLC && <LcPass3ReviewPanel challengeId={challengeId!} />}

      <LcAttachedDocsCard
        docs={attachedDocs}
        isLoading={attachedLoading}
        currentUserId={user?.id}
        onDelete={(id) => actions.deleteDocMutation.mutate(id)}
        isDeleting={actions.deleteDocMutation.isPending}
      />

      <Separator />

      {gateFailures.length > 0 && (
        <div className="space-y-3">
          {gateFailures.map((failure, idx) => (
            <Alert key={idx} variant="destructive" className="border-destructive/30">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Validation Failed</AlertTitle>
              <AlertDescription>
                <p className="text-sm">{failure}</p>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {totalAccepted} legal document{totalAccepted !== 1 ? 's' : ''} on file
            </p>
            <p className="text-xs text-muted-foreground">
              {challenge?.current_phase !== 2
                ? `Challenge is currently at Phase ${challenge?.current_phase ?? '?'}. It must be at Phase 2 before LC can submit to curation.`
                : 'Run Pass 3 and accept the unified agreement before submitting.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LcReturnToCurator challengeId={challengeId!} userId={user?.id ?? ''} disabled={submitting} />
            <LcApproveAction challengeId={challengeId!} userId={user?.id ?? ''} disabled={submitting} />
          </div>
          <Button
            onClick={handleSubmitToCuration}
            disabled={
              submitting
              || challenge?.current_phase !== 2
              || !!challenge?.lc_compliance_complete
            }
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {challenge?.lc_compliance_complete ? 'Already Submitted' : 'Submit to Curation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
