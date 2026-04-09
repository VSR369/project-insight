/**
 * CogniBlend Dashboard — Role-adaptive layout.
 * CR: My Challenges → Action Items → Challenge Journey
 * Route: /cogni/dashboard
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgModelContext } from '@/hooks/queries/useOrgContext';
import { ActionItemsWidget } from '@/components/cogniblend/dashboard/ActionItemsWidget';
import { MyActionItemsSection } from '@/components/cogniblend/dashboard/MyActionItemsSection';
import { RequestJourneySection } from '@/components/cogniblend/dashboard/RequestJourneySection';
import { useMyChallenges } from '@/hooks/cogniblend/useMyChallenges';
import type { RequestRow } from '@/components/cogniblend/dashboard/RequestJourneySection';

export default function CogniDashboardPage() {
  const { user } = useAuth();
  const { data: orgContext } = useOrgModelContext();
  // useCogniPermissions kept for future use

  // CR challenges mapped to RequestRow shape for journey section
  const { data: challengesData } = useMyChallenges(user?.id);
  const journeyRequests = useMemo<RequestRow[]>(() => {
    if (!challengesData?.items) return [];
    return challengesData.items
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
  }, [challengesData]);


  return (
    <>
      {/* ── Welcome Banner + Stats ────────────────────── */}
      <ActionItemsWidget />

      {/* ── Section 1: My Action Items ────────────────── */}
      <MyActionItemsSection />

      {/* ── Section 2: Challenge Lifecycle Journey ── */}
      <RequestJourneySection requests={journeyRequests} />
    </>
  );
}
