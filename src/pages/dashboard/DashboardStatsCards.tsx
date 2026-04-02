/**
 * DashboardStatsCards — Stats grid + Pulse widget for provider dashboard.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PulseDashboardWidget } from '@/components/pulse/dashboard';
import { User, FileText, Target, Factory } from 'lucide-react';
import { getStatusDisplayName } from '@/services/lifecycleService';
import { getStatusBadgeVariant, getStatusIcon, TERMINAL_STATUSES } from './DashboardHelpers';

interface Props {
  enrollments: any[];
  provider: any;
  totalProofPoints: number;
  activeEnrollment: any;
  isProviderTerminal: boolean;
}

export function DashboardStatsCards({
  enrollments, provider, totalProofPoints,
  activeEnrollment, isProviderTerminal,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Industries</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollments.length}</div>
            <p className="text-xs text-muted-foreground">
              {enrollments.filter(e => TERMINAL_STATUSES.includes(e.lifecycle_status) && e.lifecycle_status !== 'not_verified').length} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profile Status</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusBadgeVariant(provider?.lifecycle_status || 'registered')} className="gap-1">
                {getStatusIcon(provider?.lifecycle_status || '')}
                {getStatusDisplayName(provider?.lifecycle_status || 'New')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isProviderTerminal ? 'Profile complete' : provider?.onboarding_status === 'completed' ? 'Profile complete' : 'Complete your profile'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Proof Points</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProofPoints}</div>
            <p className="text-xs text-muted-foreground">Across all industries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Enrollment</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{activeEnrollment?.industry_segment?.name || 'None'}</div>
            <p className="text-xs text-muted-foreground">
              {activeEnrollment ? getStatusDisplayName(activeEnrollment.lifecycle_status) : 'Select an industry'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <PulseDashboardWidget />
      </div>
    </div>
  );
}
