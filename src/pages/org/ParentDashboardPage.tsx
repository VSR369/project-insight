/**
 * ParentDashboardPage — 6-widget dashboard for parent organizations
 * Phase 6: SAS-001 — Shows tier, fees, dept count, shadow charges, challenges, renewal
 */

import { AdminLayout } from '@/components/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Loader2, Crown, DollarSign, Building2, Zap, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useParentDashboardMetrics } from '@/hooks/queries/useSaasData';

const DEMO_PARENT_ORG_ID = 'demo-parent-org';

export default function ParentDashboardPage() {
  const { data: metrics, isLoading, error } = useParentDashboardMetrics(DEMO_PARENT_ORG_ID);

  if (isLoading) {
    return (
      <AdminLayout title="Parent Dashboard" breadcrumbs={[{ label: 'Parent Dashboard' }]}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Parent Dashboard" breadcrumbs={[{ label: 'Parent Dashboard' }]}>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Failed to load dashboard metrics. Please try again.
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const subscription = metrics?.subscription as {
    md_subscription_tiers?: { name: string; code: string };
    challenges_used?: number;
    challenge_limit_snapshot?: number;
  } | null;

  const membership = metrics?.membership as {
    md_membership_tiers?: { name: string; code: string };
    ends_at?: string;
    auto_renew?: boolean;
  } | null;

  const challengeUsage = metrics?.challengeLimit
    ? Math.round((metrics.challengesUsed / metrics.challengeLimit) * 100)
    : 0;

  return (
    <AdminLayout
      title="Parent Organization Dashboard"
      description="Overview of your organization's SaaS ecosystem"
      breadcrumbs={[{ label: 'Parent Dashboard' }]}
    >
      <div className="space-y-6">
        {/* Top Metrics Row */}
        <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {/* Widget 1: Subscription Tier */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tier</CardTitle>
              <Crown className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.md_subscription_tiers?.name ?? 'None'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Current plan</p>
            </CardContent>
          </Card>

          {/* Widget 2: Total Shadow Charges */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Shadow Charges</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${metrics?.totalShadowCharges?.toLocaleString() ?? '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Monthly total</p>
            </CardContent>
          </Card>

          {/* Widget 3: Department Count */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.activeCount ?? 0}
                <span className="text-sm font-normal text-muted-foreground"> / {metrics?.totalCount ?? 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active agreements</p>
            </CardContent>
          </Card>

          {/* Widget 4: Challenges Used */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Challenges</CardTitle>
              <Zap className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.challengesUsed ?? 0}
                <span className="text-sm font-normal text-muted-foreground"> / {metrics?.challengeLimit ?? '∞'}</span>
              </div>
              <Progress value={challengeUsage} className="mt-2 h-2" />
            </CardContent>
          </Card>

          {/* Widget 5: Membership */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Membership</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {membership?.md_membership_tiers?.name ?? 'None'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {membership?.auto_renew ? 'Auto-renew on' : 'Manual renewal'}
              </p>
            </CardContent>
          </Card>

          {/* Widget 6: Renewal Date */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Renewal</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.renewalDate
                  ? format(new Date(metrics.renewalDate), 'MMM dd')
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.renewalDate
                  ? format(new Date(metrics.renewalDate), 'yyyy')
                  : 'No renewal scheduled'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Agreements Summary */}
        <Card>
          <CardHeader>
            <CardTitle>SaaS Agreements Overview</CardTitle>
            <CardDescription>Status breakdown of child organization agreements</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics?.agreements && metrics.agreements.length > 0 ? (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-4">
                  {['active', 'draft', 'suspended', 'expired'].map(status => {
                    const count = metrics.agreements.filter(a => a.lifecycle_status === status).length;
                    return (
                      <div key={status} className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">{count}</p>
                        <Badge variant={status === 'active' ? 'default' : 'secondary'} className="mt-1 text-xs capitalize">
                          {status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <Separator />
                <p className="text-sm text-muted-foreground">
                  Total monthly shadow billing: <span className="font-semibold text-foreground">${metrics.totalShadowCharges.toLocaleString()}</span> across {metrics.activeCount} active agreement(s)
                </p>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">No SaaS agreements configured</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
