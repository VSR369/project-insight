import { ShieldCheck } from 'lucide-react';
import type { GovernanceMode } from '@/lib/governanceMode';
import { EscrowInstallmentWorkspace } from '@/components/cogniblend/escrow/EscrowInstallmentWorkspace';

interface StructuredFieldsSectionRendererProps {
  challengeId: string;
  userId?: string;
  governanceMode: GovernanceMode;
  isReadOnly: boolean;
}

export function StructuredFieldsSectionRenderer({ challengeId, userId, governanceMode, isReadOnly }: StructuredFieldsSectionRendererProps) {
  if (governanceMode === 'QUICK') {
    return <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><p className="text-sm text-emerald-700">Escrow not required for this governance mode.</p></div>;
  }

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Escrow schedule is available in the active workflow workspace.</p>;
  }

  return (
    <EscrowInstallmentWorkspace
      challengeId={challengeId}
      userId={userId}
      fundingRole={governanceMode === 'STRUCTURED' ? 'CU' : 'FC'}
      isReadOnly={isReadOnly || governanceMode === 'CONTROLLED'}
    />
  );
}
