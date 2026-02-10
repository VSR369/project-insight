/**
 * OrgDashboardPage — Dashboard hub for the Seeker Organization portal.
 * Shows usage gauges, tier info, quick actions, recent challenges.
 */

import { OrgLayout } from '@/components/org/OrgLayout';
import { useOrgContext } from '@/contexts/OrgContext';
import { useOrgSubscription } from '@/hooks/queries/useBillingData';
import { useOrgUsers } from '@/hooks/queries/useTeamData';
import { computeUsageSummary } from '@/services/billingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Users, CreditCard, PlusCircle, Settings, Crown, TrendingUp, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OrgDashboardPage() {
  const { organizationId, orgName, tierCode } = useOrgContext();
  const navigate = useNavigate();

  const { data: subscription, isLoading: subLoading } = useOrgSubscription(organizationId);
  const { data: users, isLoading: usersLoading } = useOrgUsers(organizationId);

  const usage = subscription
    ? computeUsageSummary(
        subscription.challenges_used ?? 0,
        subscription.challenge_limit_snapshot,
        subscription.per_challenge_fee_snapshot ?? 0
      )
    : null;

  return (
    <OrgLayout title="Dashboard" description={`Welcome to ${orgName}`}>
      {/* Usage Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {subLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Challenges Used</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {usage?.challengesUsed ?? 0}
                  <span className="text-lg text-muted-foreground ml-1">/ {usage?.challengeLimit ?? '∞'}</span>
                </div>
                {usage?.usagePercentage != null && (
                  <Progress value={usage.usagePercentage} className="mt-3" />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Package className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Remaining</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {usage?.remaining ?? '∞'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Team Members</span>
                </div>
                <div className="text-3xl font-bold text-foreground">
                  {usersLoading ? '...' : (users?.length ?? 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Tier & Subscription */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm capitalize">{tierCode ?? 'Free'}</Badge>
            <span className="text-sm text-muted-foreground">
              {subscription?.md_subscription_tiers?.name ?? 'No active subscription'}
            </span>
            <Button variant="link" size="sm" onClick={() => navigate('/org/billing')}>
              View Details →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/challenges/create')}>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <PlusCircle className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-foreground">Create Challenge</p>
              <p className="text-xs text-muted-foreground">Post a new challenge</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/challenges')}>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-foreground">View Challenges</p>
              <p className="text-xs text-muted-foreground">Manage all challenges</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/team')}>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-foreground">Manage Team</p>
              <p className="text-xs text-muted-foreground">Invite members</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/org/settings')}>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium text-foreground">Settings</p>
              <p className="text-xs text-muted-foreground">Organization profile</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </OrgLayout>
  );
}
