import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import {
  useLatestAwardDecision, useRecommendAward, useConfirmAward, useReturnAward, useCountersignAward,
} from '@/hooks/cogniblend/useAwardDecision';
import {
  getAwardActions, validateReturnReason, AWARD_STATUS_LABEL, type AwardDecisionStatus,
} from '@/services/cogniblend/lifecycle/awardActions';

interface AwardDecisionPanelProps { challengeId: string; onWinnerConfirm: (run: () => void) => void }

export function AwardDecisionPanel({ challengeId, onWinnerConfirm }: AwardDecisionPanelProps) {
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const { user } = useAuth();
  const decision = useLatestAwardDecision(challengeId);
  const recommend = useRecommendAward();
  const confirm = useConfirmAward();
  const ret = useReturnAward();
  const countersign = useCountersignAward();

  if (decision.isLoading) return <Skeleton className="h-40 w-full" />;
  if (decision.isError) {
    return (
      <Card><CardContent className="p-4 space-y-2">
        <p className="text-sm text-destructive">Could not load the award decision.</p>
        <Button variant="outline" onClick={() => decision.refetch()}>Retry</Button>
      </CardContent></Card>
    );
  }

  const d = decision.data;
  const status = (d?.decision_status ?? null) as AwardDecisionStatus | null;
  const actions = getAwardActions({
    status, recommendedBy: d?.recommended_by ?? null, confirmedBy: d?.confirmed_by ?? null, userId: user?.id ?? '',
  });
  const busy = recommend.isPending || confirm.isPending || ret.isPending || countersign.isPending;

  const handleReturn = () => {
    const err = validateReturnReason(reason);
    setReasonError(err);
    if (err || !d) return;
    ret.mutate({ challengeId, decisionId: d.id, reason: reason.trim() }, { onSuccess: () => setReason('') });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Award decision
          {status ? <Badge variant="outline">{AWARD_STATUS_LABEL[status]}</Badge> : <Badge variant="secondary">No recommendation yet</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {d?.return_reason && status === 'RETURNED' && (
          <p className="text-sm text-muted-foreground">Returned because: {d.return_reason}</p>
        )}
        {actions.confirmNeedsCountersign && (
          <p className="text-sm text-muted-foreground">You recommended this award. If you also confirm it, it will be marked "Awaiting Platform countersign" until a Senior Admin or Supervisor countersigns. If a different person confirms, the award becomes final.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {actions.canRecommend && (
            <>
              <Button disabled={busy} onClick={() => recommend.mutate({ challengeId, outcome: 'WINNER' })}>Recommend winner</Button>
              <Button variant="outline" disabled={busy} onClick={() => recommend.mutate({ challengeId, outcome: 'NO_AWARD' })}>Recommend no award</Button>
            </>
          )}
          {actions.canConfirm && d && (
            <Button disabled={busy} onClick={() => onWinnerConfirm(() => confirm.mutate({ challengeId, decisionId: d.id }))}>Confirm award</Button>
          )}
          {actions.canCountersign && d && (
            <Button disabled={busy} onClick={() => countersign.mutate({ challengeId, decisionId: d.id })}>Countersign</Button>
          )}
        </div>
        {actions.canReturn && (
          <div className="space-y-2">
            <Label htmlFor="award-return-reason">Reason for returning</Label>
            <Textarea id="award-return-reason" className="text-base" value={reason} onChange={(e) => setReason(e.target.value)} />
            {reasonError && <p className="text-sm text-destructive">{reasonError}</p>}
            <Button variant="outline" disabled={busy} onClick={handleReturn}>Return to recommender</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
