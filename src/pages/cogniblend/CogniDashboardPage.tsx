/**
 * CogniBlend Dashboard — Role-adaptive layout.
 * AM/RQ: My Requests → Action Items → Request Journey
 * CA/CR: Incoming Requests → Action Items
 * Route: /cogni/dashboard
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { ActionItemsWidget } from '@/components/cogniblend/dashboard/ActionItemsWidget';
import { MyActionItemsSection } from '@/components/cogniblend/dashboard/MyActionItemsSection';
import { MyRequestsTracker } from '@/components/cogniblend/dashboard/MyRequestsTracker';
import { RequestJourneySection } from '@/components/cogniblend/dashboard/RequestJourneySection';
import { useMyRequests } from '@/hooks/queries/useMyRequests';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { Zap } from 'lucide-react';

export default function CogniDashboardPage() {
  const { user } = useAuth();
  const { data: orgContext } = useOrgModelContext();
  const { activeRole } = useCogniRoleContext();

  const isAmRq = activeRole === 'AM' || activeRole === 'RQ' || !activeRole;

  // AM-scoped requests for the journey section (only needed for AM/RQ)
  const { data: requestsData } = useMyRequests('all', '', 'mine');
  const allMyRequests = useMemo(
    () => requestsData?.pages.flatMap((p) => p.rows) ?? [],
    [requestsData],
  );

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

      {/* ── Section 1: Requests (role-adaptive) ──────── */}
      <MyRequestsTracker />

      {/* ── Section 2: My Action Items ────────────────── */}
      <MyActionItemsSection />

      {/* ── Section 3: Request Lifecycle Journey (AM/RQ only) ── */}
      {isAmRq && <RequestJourneySection requests={allMyRequests} />}
    </>
  );
}