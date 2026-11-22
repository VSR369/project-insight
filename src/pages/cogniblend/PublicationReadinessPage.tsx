/**
 * Publication Readiness Page — /cogni/challenges/:id/publish
 * Displays GATE-11 (Structured/Controlled) or GATE-11-L (Quick) pre-publication checklist.
 */

import { useState } from 'react';
import { resolveGovernanceMode, isQuickMode } from '@/lib/governanceMode';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { PublicationChecklist } from '@/components/cogniblend/publication/PublicationChecklist';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePublicationReadiness } from '@/hooks/cogniblend/usePublicationReadiness';
import { useEscrowDeposit } from '@/hooks/cogniblend/useEscrowDeposit';
import { usePublishChallenge } from '@/hooks/cogniblend/usePublishChallenge';
import { useMatchingSolvers } from '@/hooks/cogniblend/useMatchingSolvers';
import { EscrowDepositSection } from '@/components/cogniblend/publication/EscrowDepositSection';
import { PublishConfirmModal } from '@/components/cogniblend/publication/PublishConfirmModal';
import { PublishSuccessScreen } from '@/components/cogniblend/publication/PublishSuccessScreen';
import { useAuth } from '@/hooks/useAuth';
import { useNotifySolvers } from '@/hooks/cogniblend/useNotifySolvers';
import { useStageDeadlines } from '@/hooks/queries/useStageDeadlines';
import { shouldHoldForFutureStart } from '@/services/cogniblend/lifecycle/lifecycleJobs';

/* ─── Component ──────────────────────────────────────────── */

export default function PublicationReadinessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishedResult, setPublishedResult] = useState<{
    id: string;
    title: string;
    scheduled: boolean;
    scheduledStart: string | null;
  } | null>(null);

  const { data, isLoading, error } = usePublicationReadiness(id);
  const escrowQuery = useEscrowDeposit(
    data?.governanceProfile !== 'QUICK' ? id : undefined,
    user?.id,
  );
  const publishMutation = usePublishChallenge();
  const notifySolversMutation = useNotifySolvers();
  const { data: solverMatch } = useMatchingSolvers(id);
  const { data: stageDeadlines } = useStageDeadlines(id);
  const isFutureStart = shouldHoldForFutureStart(stageDeadlines?.startAt?.toISOString() ?? null, new Date());

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : 'Failed to load readiness data.'}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Go Back
        </Button>
      </div>
    );
  }

  const isQuick = isQuickMode(resolveGovernanceMode(data.governanceProfile));

  // Publish disabled logic
  const escrowBlocking = !isQuick && escrowQuery.data?.escrow?.escrow_status !== 'FUNDED';
  const canPublish = data.allPassed && !escrowBlocking;

  const handlePublish = () => {
    if (!id || !user?.id) return;
    publishMutation.mutate(
      { challengeId: id, userId: user.id },
      {
        onSuccess: (result) => {
          setPublishedResult({
            id: result.challengeId,
            title: result.challengeTitle,
            scheduled: result.scheduled,
            scheduledStart: result.scheduledStart,
          });
          if (!result.scheduled) {
            notifySolversMutation.mutate({
              challengeId: result.challengeId,
              challengeTitle: result.challengeTitle,
              totalAward: 0,
              currencyCode: 'USD',
              deadlineDays: null,
            });
          }
        },
      },
    );
    setConfirmOpen(false);
  };

  // Success screen
  if (publishedResult) {
    return (
      <PublishSuccessScreen
        challengeId={publishedResult.id}
        challengeTitle={publishedResult.title}
        scheduled={publishedResult.scheduled}
        scheduledStart={publishedResult.scheduledStart}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* ═══ Header ═══ */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground -ml-2 mb-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Publication Readiness
            </h1>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {data.challengeTitle}
            </p>
          </div>
          <GovernanceProfileBadge profile={data.governanceProfile} compact />
        </div>
      </div>

      <PublicationChecklist
        checks={data.checks}
        allPassed={data.allPassed}
        failCount={data.failCount}
        isQuick={isQuick}
      />

      {/* ═══ Provider Matchmaking (GAP-12) ═══ */}
      {solverMatch && solverMatch.totalMatched > 0 && (
        <Card className="border-border">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {solverMatch.totalMatched} Qualified Solution Provider{solverMatch.totalMatched !== 1 ? 's' : ''} Matched
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Based on certification tier and challenge complexity
                </p>
              </div>
              <div className="flex gap-2">
                {solverMatch.byTier.map((t) => (
                  <Badge key={t.tier} variant="secondary" className="text-xs">
                    Tier {t.tier}: {t.count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Escrow Section (Enterprise only) ═══ */}
      {!isQuick && id && (
        <EscrowDepositSection challengeId={id} userId={user?.id} />
      )}

      {/* ═══ Summary + Publish ═══ */}
      <div className="space-y-4 pb-8">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            {data.checks.filter((c) => c.passed).length} of {data.checks.length} checks passed
          </p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-full">
                <Button
                  size="lg"
                  className="w-full text-base"
                  disabled={!canPublish || publishMutation.isPending}
                  onClick={() => setConfirmOpen(true)}
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Rocket className="h-5 w-5 mr-2" />
                  )}
                  {isFutureStart ? 'Schedule Challenge' : 'Publish Challenge'}
                </Button>
              </div>
            </TooltipTrigger>
            {!canPublish && (
              <TooltipContent>
                <p>Resolve all items above to enable publishing.</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* ═══ Confirm Modal ═══ */}
      <PublishConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handlePublish}
        isPending={publishMutation.isPending}
        scheduled={isFutureStart}
        startAt={stageDeadlines?.startAt?.toISOString() ?? null}
      />
    </div>
  );
}
