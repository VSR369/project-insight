/**
 * PulseModerationPage - Trust Council moderation interface
 * Only accessible to Trust Council members (1000+ reputation)
 */

import { PulseLayout } from '@/components/pulse/layout/PulseLayout';
import { TrustCouncilDashboard } from '@/components/pulse/cards/TrustCouncilDashboard';

export default function PulseModerationPage() {
  return (
    <PulseLayout title="Trust Council">
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto">
        <TrustCouncilDashboard />
      </div>
    </PulseLayout>
  );
}
