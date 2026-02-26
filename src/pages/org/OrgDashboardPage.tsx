/**
 * OrgDashboardPage — Dashboard hub for the Seeker Organization portal.
 * Shows usage gauges, tier info, quick actions, registration data summary.
 */

import { OrgLayout } from '@/components/org/OrgLayout';
import { useOrgContext } from '@/contexts/OrgContext';
import { useOrgSubscription as useOrgSubBilling } from '@/hooks/queries/useBillingData';
import { useOrgUsers } from '@/hooks/queries/useTeamData';
import { useOrgProfile, useOrgSubscription as useOrgSubSettings } from '@/hooks/queries/useOrgSettings';
import { useOrgAdminDetails } from '@/hooks/queries/useOrgAdminHooks';
import { computeUsageSummary } from '@/services/billingService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, Users, PlusCircle, Settings, Crown, TrendingUp, Package, Building2, UserCircle, CreditCard, Globe, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function OrgDashboardPage() {
  const { organizationId, orgName, tierCode } = useOrgContext();
  const navigate = useNavigate();

  const { data: billingSubscription, isLoading: subLoading } = useOrgSubBilling(organizationId);
  const { data: settingsSubscription } = useOrgSubSettings(organizationId);
  const { data: users, isLoading: usersLoading } = useOrgUsers(organizationId);
  const { data: profile, isLoading: profileLoading } = useOrgProfile(organizationId);
  const { data: adminDetails, isLoading: adminLoading } = useOrgAdminDetails(organizationId);

  const usage = billingSubscription
    ? computeUsageSummary(
        billingSubscription.challenges_used ?? 0,
        billingSubscription.challenge_limit_snapshot,
        billingSubscription.per_challenge_fee_snapshot ?? 0
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
              {(settingsSubscription as any)?.md_subscription_tiers?.name ?? 'No active subscription'}
            </span>
            <Button variant="link" size="sm" onClick={() => navigate('/org/billing')}>
              View Details →
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Registration Data Summary */}
      <h2 className="text-lg font-semibold text-foreground mb-4">Registration Summary</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Organization Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Organization Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {profileLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Legal Name</span>
                  <span className="font-medium text-foreground truncate ml-2">{profile?.legal_entity_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium text-foreground">{(profile as any)?.organization_types?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Country</span>
                  <span className="font-medium text-foreground">{(profile as any)?.countries?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Website</span>
                  <span className="font-medium text-foreground truncate ml-2">{profile?.website_url ?? '—'}</span>
                </div>
              </>
            )}
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/org/settings')}>
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Admin Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-primary" />
              Admin Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {adminLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{adminDetails?.full_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground truncate ml-2">{adminDetails?.email ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="text-xs">{adminDetails?.invitation_status ?? '—'}</Badge>
                </div>
              </>
            )}
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/org/settings?tab=admin')}>
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Subscription & Billing Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Subscription & Billing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {subLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tier</span>
                  <Badge variant="outline" className="text-xs capitalize">{(settingsSubscription as any)?.md_subscription_tiers?.name ?? '—'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Billing Cycle</span>
                  <span className="font-medium text-foreground">{(settingsSubscription as any)?.md_billing_cycles?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engagement</span>
                  <span className="font-medium text-foreground">{(settingsSubscription as any)?.md_engagement_models?.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Period</span>
                  <span className="font-medium text-foreground text-xs">
                    {settingsSubscription?.current_period_start
                      ? `${format(new Date(settingsSubscription.current_period_start), 'MMM d')} – ${settingsSubscription.current_period_end ? format(new Date(settingsSubscription.current_period_end), 'MMM d, yyyy') : '—'}`
                      : '—'}
                  </span>
                </div>
              </>
            )}
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/org/settings?tab=subscription')}>
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Team Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {usersLoading ? (
              <div className="space-y-2"><Skeleton className="h-4 w-full" /></div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Members</span>
                  <span className="font-medium text-foreground">{users?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admins</span>
                  <span className="font-medium text-foreground">
                    {users?.filter((u) => u.role === 'tenant_admin' || u.role === 'admin' || u.role === 'owner').length ?? 0}
                  </span>
                </div>
              </>
            )}
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/org/team')}>
              View Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </OrgLayout>
  );
}
