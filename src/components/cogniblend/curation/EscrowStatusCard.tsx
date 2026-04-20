/**
 * EscrowStatusCard — Curator read-only summary of FC-confirmed escrow.
 * S7D-2: reuses `PreviewEscrowSection` for a consistent snapshot.
 *
 * Renders nothing until the FC has marked compliance complete
 * (`fc_compliance_complete = true`).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import { PreviewEscrowSection } from '@/components/cogniblend/preview/PreviewEscrowSection';
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';

export interface EscrowStatusCardProps {
  challengeId: string;
}

export function EscrowStatusCard({ challengeId }: EscrowStatusCardProps) {
  const { challenge, escrowRecord, isLoading } = usePreviewData(challengeId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!challenge) return null;

  const fcComplete = !!(challenge as { fc_compliance_complete?: boolean }).fc_compliance_complete;
  if (!fcComplete) return null;

  const govMode = resolveGovernanceMode(
    (challenge as { governance_mode_override?: string | null; governance_profile?: string | null })
      .governance_mode_override
      ?? (challenge as { governance_profile?: string | null }).governance_profile,
  );
  const isControlled = isControlledMode(govMode);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          Escrow Status
          <Badge variant="outline" className="text-[10px] ml-1">FC-confirmed</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <PreviewEscrowSection
          escrow={escrowRecord}
          fcComplete={fcComplete}
          isControlled={isControlled}
        />
      </CardContent>
    </Card>
  );
}

export default EscrowStatusCard;
