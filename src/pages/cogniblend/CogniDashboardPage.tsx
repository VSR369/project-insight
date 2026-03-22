/**
 * CogniBlend Dashboard — Simplified two-section layout.
 * Route: /cogni/dashboard
 */

import { useAuth } from '@/hooks/useAuth';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useCogniRoleContext } from '@/contexts/CogniRoleContext';
import { ActionItemsWidget } from '@/components/cogniblend/dashboard/ActionItemsWidget';
import { MyActionItemsSection } from '@/components/cogniblend/dashboard/MyActionItemsSection';
import { MyRequestsTracker } from '@/components/cogniblend/dashboard/MyRequestsTracker';
import { RecentNotificationsWidget } from '@/components/cogniblend/dashboard/RecentNotificationsWidget';
import { Zap } from 'lucide-react';

export default function CogniDashboardPage() {
  const { user } = useAuth();
  const { activeRole } = useCogniRoleContext();
  const { data: orgContext } = useOrgModelContext();

  const showBypassBanner = orgContext?.operatingModel === 'AGG' && orgContext?.phase1Bypass;

  return (
    <>
      {/* ── Welcome Banner + Stats (from ActionItemsWidget) ── */}
      <ActionItemsWidget />

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

      {/* ── Section 1: My Action Items ───────────────────── */}
      <MyActionItemsSection />

      {/* ── Section 2: My Requests Tracker ───────────────── */}
      <MyRequestsTracker />

      {/* ── Recent Notifications ─────────────────────────── */}
      <div className="mt-5">
        <RecentNotificationsWidget />
      </div>
    </>
  );
}
