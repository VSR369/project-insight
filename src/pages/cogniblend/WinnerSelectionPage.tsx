/**
 * WinnerSelectionPage — /cogni/selection
 * Placeholder for winner selection flow with WINNER_SELECTED legal gate wired in.
 * When "Confirm Winner" is clicked, the legal gate fires first (IPAA).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, ShieldCheck, Trophy } from 'lucide-react';
import { useLegalGateAction } from '@/hooks/legal/useLegalGateAction';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import { toast } from 'sonner';

export default function WinnerSelectionPage() {
  const [confirmed, setConfirmed] = useState(false);

  const legalGate = useLegalGateAction({
    triggerEvent: 'WINNER_SELECTED',
    userRole: 'ALL',
    governanceMode: 'ALL',
  });

  const handleConfirmWinner = () => {
    legalGate.gateAction(() => {
      setConfirmed(true);
      toast.success('Winner confirmed successfully');
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold text-foreground">Selection & IP</h1>
        <Badge variant="outline">Coming Soon</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Winner Selection Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select winning solutions and manage IP transfer processes.
            The confirmation action is gated by the IPAA legal agreement.
          </p>

          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              Confirming a winner requires acceptance of the IP &amp; Award Agreement (IPAA)
              by both the Challenge Representative and the winning solver.
            </p>
          </div>

          {confirmed ? (
            <Badge className="bg-green-100 text-green-800">Winner Confirmed</Badge>
          ) : (
            <Button onClick={handleConfirmWinner}>
              <Trophy className="h-4 w-4 mr-1.5" />
              Confirm Winner
            </Button>
          )}
        </CardContent>
      </Card>

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
