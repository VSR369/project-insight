/**
 * CogniBlend Dashboard — Page content (rendered inside CogniShell).
 * Route: /cogni/dashboard
 */

import { useAuth } from '@/hooks/useAuth';
import { useCogniDashboard } from '@/hooks/cogniblend/useCogniDashboard';
import { useCogniWaitingFor } from '@/hooks/cogniblend/useCogniWaitingFor';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';
import { useCompletePhase } from '@/hooks/cogniblend/useCompletePhase';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { NeedsActionSection } from '@/components/cogniblend/dashboard/NeedsActionSection';
import { WaitingForSection } from '@/components/cogniblend/dashboard/WaitingForSection';
import { MyChallengesSection } from '@/components/cogniblend/dashboard/MyChallengesSection';
import { OpenChallengesSection } from '@/components/cogniblend/dashboard/OpenChallengesSection';
import { RecentActivitySection } from '@/components/cogniblend/dashboard/RecentActivitySection';
import { ActionItemsWidget } from '@/components/cogniblend/dashboard/ActionItemsWidget';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function CogniDashboardPage() {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useCogniDashboard(user?.id);
  const { data: waitingItems = [], isLoading: waitingLoading } = useCogniWaitingFor(user?.id);
  const { data: myChallenges, isLoading: myChallengesLoading } = useMyChallenges(user?.id);
  const completePhase = useCompletePhase();
  const { data: orgContext } = useOrgModelContext();

  const showBypassBanner = orgContext?.operatingModel === 'AGG' && orgContext?.phase1Bypass;

  const handleTransition = (challengeId: string, action: string) => {
    if (action === 'complete_phase' && user?.id) {
      completePhase.mutate({ challengeId, userId: user.id });
      return;
    }
    toast.info(`Action "${action}" on challenge ${challengeId.slice(0, 8)}… (not yet implemented)`);
  };

  return (
    <>
      {/* ── AGG Phase 1 Bypass Banner ────────────────────── */}
      {showBypassBanner && (
        <div className="rounded-lg border border-[hsl(210,68%,70%)] bg-[hsl(210,68%,96%)] p-3 mb-5 flex items-center gap-3">
          <Zap className="h-5 w-5 shrink-0 text-[hsl(210,68%,54%)]" />
          <p className="text-sm font-medium text-[hsl(210,68%,30%)]">
            Your organization has direct challenge creation enabled.
            <span className="font-normal text-[hsl(210,40%,45%)] ml-1">
              Phase 1 (Solution Request) is automatically bypassed.
            </span>
          </p>
        </div>
      )}

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
      <MyChallengesSection
        items={myChallenges?.items ?? []}
        roleCounts={myChallenges?.roleCounts ?? {}}
        isLoading={myChallengesLoading}
      />
      <OpenChallengesSection />
      <RecentActivitySection />
    </>
  );
}
