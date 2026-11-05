/**
 * ReviewerPwaGate — Prompt shown to reviewers (ER/CU/CR) who reach a solution
 * review screen without an accepted Prize & Work Agreement. RLS already hides
 * the submissions server-side (BR-SEC-019); this replaces the confusing empty
 * list with an explanation and an accept action. Opens LegalGateModal on the
 * SOLUTION_REVIEW trigger; an existing global PWA acceptance auto-passes.
 */
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSignature } from 'lucide-react';
import { useLegalGateAction } from '@/hooks/legal/useLegalGateAction';
import { LegalGateModal } from '@/components/legal/LegalGateModal';

export interface ReviewerPwaGateProps {
  userId: string;
  onAccepted: () => void;
}

export function ReviewerPwaGate({ userId, onAccepted }: ReviewerPwaGateProps) {
  const queryClient = useQueryClient();
  const legalGate = useLegalGateAction({ triggerEvent: 'SOLUTION_REVIEW', userRole: 'ALL', governanceMode: 'ALL' });

  const handleAccepted = () => {
    legalGate.handleAllAccepted();
    queryClient.invalidateQueries({ queryKey: ['pwa-acceptance-status', userId] });
    onAccepted();
  };

  return (
    <div className="p-6">
      <Card>
        <CardContent className="space-y-3 p-8 text-center">
          <FileSignature className="mx-auto h-10 w-10 text-primary" />
          <p className="text-sm font-medium text-foreground">Agreement required</p>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">
            Submissions are confidential. To view them you must first read and accept the
            Prize &amp; Work Agreement. If you decline, submissions stay hidden.
          </p>
          <Button onClick={() => legalGate.gateAction(() => {})}>Review &amp; Accept the Agreement</Button>
        </CardContent>
      </Card>
      {legalGate.showGate && (
        <LegalGateModal
          triggerEvent={legalGate.triggerEvent}
          userRole={legalGate.userRole}
          governanceMode={legalGate.governanceMode}
          onAllAccepted={handleAccepted}
          onDeclined={legalGate.handleDeclined}
        />
      )}
    </div>
  );
}

export default ReviewerPwaGate;
