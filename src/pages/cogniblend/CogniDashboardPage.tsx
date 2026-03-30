/**
 * CogniBlend Dashboard — Role-adaptive layout.
 * CR: My Challenges → Action Items → Challenge Journey
 * Route: /cogni/dashboard
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { ActionItemsWidget } from '@/components/cogniblend/dashboard/ActionItemsWidget';
import { MyActionItemsSection } from '@/components/cogniblend/dashboard/MyActionItemsSection';
import { RequestJourneySection } from '@/components/cogniblend/dashboard/RequestJourneySection';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';
import { useCogniPermissions } from '@/hooks/cogniblend/useCogniPermissions';
import { Zap } from 'lucide-react';
import type { RequestRow } from '@/hooks/queries/useMyRequests';

export default function CogniDashboardPage() {
  const { user } = useAuth();
  const { data: orgContext } = useOrgModelContext();
  const { isSpecRole } = useCogniPermissions();

  // CR challenges mapped to RequestRow shape for journey section
  const { data: challengesData } = useMyChallenges(user?.id);
  const journeyRequests = useMemo<RequestRow[]>(() => {
    if (!isSpecRole || !challengesData?.items) return [];
    return challengesData.items
      .filter((ch) => ch.master_status !== 'DRAFT')
      .map((ch) => ({
        id: ch.challenge_id,
        title: ch.title,
        master_status: ch.master_status,
        operating_model: ch.operating_model,
        current_phase: ch.current_phase,
        phase_status: ch.phase_status,
        created_at: '',
        updated_at: null,
        urgency: 'NORMAL',
        architect_name: null,
      }));
  }, [isSpecRole, challengesData]);

  const showBypassBanner = orgContext?.operatingModel === 'AGG' && orgContext?.phase1Bypass;

  return (
    <>
      {/* ── Welcome Banner + Stats ────────────────────── */}
      <ActionItemsWidget />

      {/* ── AGG Phase 1 Bypass Banner ────────────────── */}
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

      {/* ── Section 1: My Action Items ────────────────── */}
      <MyActionItemsSection />

      {/* ── Section 2: Challenge Lifecycle Journey ── */}
      <RequestJourneySection requests={journeyRequests} />
    </>
  );
}
