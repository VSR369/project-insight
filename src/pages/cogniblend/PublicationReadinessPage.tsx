/**
 * Publication Readiness Page — /cogni/challenges/:id/publish
 * Displays GATE-11 (Enterprise) or GATE-11-L (Lightweight) pre-publication checklist.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, ArrowLeft, ShieldCheck, AlertTriangle, Loader2, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePublicationReadiness } from '@/hooks/cogniblend/usePublicationReadiness';
import { useEscrowDeposit } from '@/hooks/cogniblend/useEscrowDeposit';
import { usePublishChallenge } from '@/hooks/cogniblend/usePublishChallenge';
import { EscrowDepositSection } from '@/components/cogniblend/publication/EscrowDepositSection';
import { PublishConfirmModal } from '@/components/cogniblend/publication/PublishConfirmModal';
import { PublishSuccessScreen } from '@/components/cogniblend/publication/PublishSuccessScreen';
import { useAuth } from '@/hooks/useAuth';

/* ─── Component ──────────────────────────────────────────── */

export default function PublicationReadinessPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishedResult, setPublishedResult] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading, error } = usePublicationReadiness(id);
  const escrowQuery = useEscrowDeposit(
    data?.governanceProfile !== 'LIGHTWEIGHT' ? id : undefined,
    user?.id,
  );
  const publishMutation = usePublishChallenge();

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

  const isLightweight = data.governanceProfile === 'LIGHTWEIGHT';

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
          <Badge
            variant="secondary"
            className={cn(
              'shrink-0 text-xs font-semibold px-2.5 py-0.5 border',
              isLightweight
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-violet-50 text-violet-700 border-violet-200'
            )}
          >
            {isLightweight ? 'Lightweight' : 'Enterprise'}
          </Badge>
        </div>
      </div>

      {/* ═══ Status Banner ═══ */}
      <div
        className={cn(
          'rounded-lg border px-5 py-4 flex items-center gap-3',
          data.allPassed
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-red-50 border-red-200'
        )}
      >
        {data.allPassed ? (
          <>
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-800">
                READY TO PUBLISH — All checks passed
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                This challenge meets all {isLightweight ? 'GATE-11-L' : 'GATE-11'} requirements.
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-bold text-red-800">
                {data.failCount} item{data.failCount !== 1 ? 's' : ''} need{data.failCount === 1 ? 's' : ''} attention before publishing
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Resolve the items below to pass {isLightweight ? 'GATE-11-L' : 'GATE-11'} validation.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ═══ Checklist Card ═══ */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Pre-Publication Validation
            <Badge variant="outline" className="ml-auto text-xs font-normal">
              {isLightweight ? 'GATE-11-L' : 'GATE-11'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-0">
          {data.checks.map((check, idx) => (
            <div key={check.id}>
              {idx > 0 && <Separator className="my-0" />}
              <div className="flex items-start gap-3 py-3.5">
                {check.passed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-[13px] font-semibold',
                    check.passed ? 'text-foreground' : 'text-red-700'
                  )}>
                    {check.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {check.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ═══ Escrow Section (Enterprise only) ═══ */}
      {!isLightweight && id && (
        <EscrowDepositSection challengeId={id} userId={user?.id} />
      )}

      {/* ═══ Summary Footer ═══ */}
      <div className="text-center pb-8">
        <p className="text-xs text-muted-foreground">
          {data.checks.filter((c) => c.passed).length} of {data.checks.length} checks passed
        </p>
      </div>
    </div>
  );
}
