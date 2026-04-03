/**
 * GovernanceModeConfigPage — Admin page for viewing/editing governance mode behaviors.
 * Route: /admin/seeker-config/governance-modes
 */

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAllGovernanceModeConfigs } from '@/hooks/queries/useGovernanceModeConfig';
import { GovernanceModeCard } from '@/components/admin/governance/GovernanceModeCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function GovernanceModeConfigPage() {
  const navigate = useNavigate();
  const { data: configs, isLoading, error } = useAllGovernanceModeConfigs();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/seeker-config/governance-rules')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Governance Mode Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Configure legal, escrow, curation, and evaluation behaviors per governance mode.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[400px] rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load governance mode configuration. Please try again.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && configs && configs.length === 0 && (
        <Alert>
          <AlertDescription>No governance modes configured. Run the seed migration first.</AlertDescription>
        </Alert>
      )}

      {!isLoading && configs && configs.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {configs.map((config) => (
            <GovernanceModeCard key={config.governance_mode} config={config} />
          ))}
        </div>
      )}
    </div>
  );
}
