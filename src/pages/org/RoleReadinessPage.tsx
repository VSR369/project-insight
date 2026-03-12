/**
 * RoleReadinessPage — Full-page Role Readiness Status view
 * Route: /org/role-readiness
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useOrgContext } from '@/contexts/OrgContext';
import { RoleReadinessTable } from '@/components/rbac/RoleReadinessTable';
import { FeatureErrorBoundary } from '@/components/ErrorBoundary';

export default function RoleReadinessPage() {
  const navigate = useNavigate();
  const { organizationId } = useOrgContext();

  return (
    <FeatureErrorBoundary featureName="RoleReadinessPage">
      <div className="space-y-6 p-6">
        <button
          onClick={() => navigate('/org/role-management')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Role Management
        </button>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Role Readiness Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Full overview of all mandatory role assignments
          </p>
        </div>

        <RoleReadinessTable orgId={organizationId} model="agg" />
      </div>
    </FeatureErrorBoundary>
  );
}
