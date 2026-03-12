/**
 * RoleReadinessPage — Standalone page wrapping RoleReadinessPanel
 * Route: /org/role-readiness
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
          <h1 className="text-2xl font-bold text-foreground">Role Readiness Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View the readiness status for all required roles across engagement models.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RoleReadinessPanel
            orgId={organizationId}
            model="mp"
            onNavigateToAssign={(roleCode) => navigate(`/org/role-management?assign=${roleCode}`)}
          />
          <RoleReadinessPanel
            orgId={organizationId}
            model="agg"
            onNavigateToAssign={(roleCode) => navigate(`/org/role-management?assign=${roleCode}`)}
          />
        </div>
      </div>
    </FeatureErrorBoundary>
  );
}
