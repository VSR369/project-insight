/**
 * WinnerSelectionPage — /cogni/selection
 * Award recommend → confirm/return → countersign. Confirm is gated by IPAA.
 */
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy } from 'lucide-react';
import { useLegalGateAction } from '@/hooks/legal/useLegalGateAction';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import { useAwardChallenges } from '@/hooks/cogniblend/useAwardDecision';
import { AwardDecisionPanel } from '@/components/cogniblend/award/AwardDecisionPanel';

export default function WinnerSelectionPage() {
  const [params, setParams] = useSearchParams();
  const legalGate = useLegalGateAction({ triggerEvent: 'WINNER_SELECTED', userRole: 'ALL', governanceMode: 'ALL' });
  const challenges = useAwardChallenges();
  const selected = params.get('challenge');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Selection &amp; Award</h1>
      </div>

      {challenges.isLoading && <Skeleton className="h-11 w-full" />}
      {challenges.isError && (
        <Card><CardContent className="p-4 space-y-2">
          <p className="text-sm text-destructive">Could not load challenges.</p>
          <Button variant="outline" onClick={() => challenges.refetch()}>Retry</Button>
        </CardContent></Card>
      )}
      {challenges.data && challenges.data.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          No challenges are in evaluation or award yet.
        </CardContent></Card>
      )}
      {challenges.data && challenges.data.length > 0 && (
        <Select value={selected ?? undefined} onValueChange={(v) => setParams({ challenge: v })}>
          <SelectTrigger aria-label="Choose challenge" className="h-11"><SelectValue placeholder="Choose a challenge" /></SelectTrigger>
          <SelectContent>
            {challenges.data.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {selected && <AwardDecisionPanel challengeId={selected} onWinnerConfirm={legalGate.gateAction} />}

      {legalGate.showGate && (
        <LegalGateModal
          triggerEvent={legalGate.triggerEvent}
          challengeId={legalGate.challengeId}
          userRole={legalGate.userRole}
          governanceMode={legalGate.governanceMode}
          onAllAccepted={legalGate.handleAllAccepted}
          onDeclined={legalGate.handleDeclined}
        />
      )}
    </div>
  );
}
