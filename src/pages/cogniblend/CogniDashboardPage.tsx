/**
 * CogniBlend Dashboard — Page content (rendered inside CogniShell).
 * Route: /cogni/dashboard
 */

import { useAuth } from '@/hooks/useAuth';
import { useCogniDashboard } from '@/hooks/cogniblend/useCogniDashboard';
import { useCogniWaitingFor } from '@/hooks/cogniblend/useCogniWaitingFor';
import { useCompletePhase } from '@/hooks/cogniblend/useCompletePhase';
import { NeedsActionSection } from '@/components/cogniblend/dashboard/NeedsActionSection';
import { WaitingForSection } from '@/components/cogniblend/dashboard/WaitingForSection';
import { OpenChallengesSection } from '@/components/cogniblend/dashboard/OpenChallengesSection';
import { RecentActivitySection } from '@/components/cogniblend/dashboard/RecentActivitySection';
import { toast } from 'sonner';

export default function CogniDashboardPage() {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useCogniDashboard(user?.id);
  const { data: waitingItems = [], isLoading: waitingLoading } = useCogniWaitingFor(user?.id);
  const completePhase = useCompletePhase();

  const handleTransition = (challengeId: string, action: string) => {
    if (action === 'complete_phase' && user?.id) {
      completePhase.mutate({ challengeId, userId: user.id });
      return;
    }
    toast.info(`Action "${action}" on challenge ${challengeId.slice(0, 8)}… (not yet implemented)`);
  };

  return (
    <>
      <NeedsActionSection
        items={items}
        isLoading={isLoading}
        completingChallengeId={completePhase.isPending ? (completePhase.variables?.challengeId ?? null) : null}
        onTransition={handleTransition}
      />
      <WaitingForSection
        items={waitingItems}
        isLoading={waitingLoading}
      />
      <OpenChallengesSection />
      <RecentActivitySection />
    </>
  );
}
