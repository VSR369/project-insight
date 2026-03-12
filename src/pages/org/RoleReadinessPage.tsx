/**
 * RoleReadinessPage — Standalone page wrapping RoleReadinessPanel
 * Route: /org/role-readiness
 * BR-CORE-004: SO Admin sees Aggregator + Core readiness only (no Marketplace).
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useOrgContext } from '@/contexts/OrgContext';
import { RoleReadinessPanel } from '@/components/rbac/RoleReadinessPanel';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';

export default function RoleReadinessPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrgContext();

  return (
    <FeatureErrorBoundary featureName="RoleReadinessPage">
      <div className="space-y-6 p-6">
        <button
          onClick={() => navigate('/org/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Aggregator Role Readiness Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View the readiness status for all required core and aggregator roles.
          </p>
        </div>

        <RoleReadinessPanel
          orgId={organizationId}
          model="agg"
          onNavigateToAssign={(roleCode) => navigate(`/org/role-management?assign=${roleCode}`)}
        />
      </div>
    </FeatureErrorBoundary>
  );
}
