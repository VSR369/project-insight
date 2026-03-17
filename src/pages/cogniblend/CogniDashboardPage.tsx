/**
 * CogniBlend Dashboard — Page content (rendered inside CogniShell).
 * Route: /cogni/dashboard
 */

import { useAuth } from '@/hooks/useAuth';
import { useCogniDashboard } from '@/hooks/cogniblend/useCogniDashboard';
import { NeedsActionSection } from '@/components/cogniblend/dashboard/NeedsActionSection';
import { toast } from 'sonner';

export default function CogniDashboardPage() {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useCogniDashboard(user?.id);

  const handleTransition = (challengeId: string, action: string) => {
    // Placeholder — will be wired to a mutation in a future module
    toast.info(`Action "${action}" on challenge ${challengeId.slice(0, 8)}… (not yet implemented)`);
  };

  return (
    <>
      <NeedsActionSection
        items={items}
        isLoading={isLoading}
        onTransition={handleTransition}
      />
    </>
  );
}
