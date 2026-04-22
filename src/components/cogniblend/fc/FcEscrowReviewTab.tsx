import { AlertCircle, Banknote } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RecommendedEscrowCard } from '@/components/cogniblend/fc/RecommendedEscrowCard';
import { EscrowInstallmentWorkspace } from '@/components/cogniblend/escrow/EscrowInstallmentWorkspace';
import type { GovernanceMode } from '@/lib/governanceMode';

interface FcEscrowReviewTabProps {
  challengeId: string;
  userId: string;
  governanceMode: GovernanceMode;
  currentPhase: number | null | undefined;
  rewardTotal: number;
  isPreview: boolean;
  isFunded: boolean;
  fcDone: boolean;
}

function formatCurrency(amount: number): string {
  return `USD ${amount.toLocaleString()}`;
}

export function FcEscrowReviewTab({ challengeId, userId, governanceMode, currentPhase, rewardTotal, isPreview, isFunded, fcDone }: FcEscrowReviewTabProps) {
  const escrowStatus = isFunded ? 'FUNDED' : 'PENDING';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Banknote className="h-4 w-4 text-primary" />
            Escrow Status
            <Badge variant={isFunded ? 'default' : 'secondary'} className="ml-auto">
              {escrowStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-muted-foreground">Expected escrow</span>
            <span className="font-mono font-semibold">{formatCurrency(rewardTotal)}</span>
          </div>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-muted-foreground">Lifecycle gate</span>
            <span>{isPreview ? `Preview only until Phase 3 (currently Phase ${currentPhase ?? '?'})` : 'Escrow submission is unlocked'}</span>
          </div>
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
            <span className="text-muted-foreground">Governance</span>
            <span>{governanceMode === 'CONTROLLED' ? 'Mandatory before publication' : 'Optional escrow flow'}</span>
          </div>
        </CardContent>
      </Card>

      {isPreview ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Escrow schedule</AlertTitle>
          <AlertDescription>
            Select a pending installment to confirm funding. Funding is captured per installment and linked to bank and proof details.
          </AlertDescription>
        </Alert>
      ) : null}

      <RecommendedEscrowCard challengeId={challengeId} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Escrow schedule</CardTitle>
          <p className="text-xs text-muted-foreground">
            Funding is captured per installment and linked to bank, proof, and confirmation details.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <EscrowInstallmentWorkspace
            challengeId={challengeId}
            userId={userId}
            fundingRole="FC"
            isReadOnly={fcDone}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default FcEscrowReviewTab;
