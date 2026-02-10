/**
 * Subscription Tab (ORG-001)
 * 
 * Shows current tier, billing cycle, usage, and tier change options.
 * Upgrade = immediate, Downgrade = scheduled for next cycle.
 */

import { useState } from 'react';
import { Crown, Zap, Star, ArrowUpCircle, ArrowDownCircle, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

import { useOrgSubscription, useChangeTier } from '@/hooks/queries/useOrgSettings';
import { useSubscriptionTiers, useTierFeatures } from '@/hooks/queries/usePlanSelectionData';
import { determineTierChangeType } from '@/services/orgSettingsService';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const TIER_ICONS: Record<string, React.ReactNode> = {
  basic: <Zap className="h-5 w-5" />,
  standard: <Star className="h-5 w-5" />,
  premium: <Crown className="h-5 w-5" />,
};

interface SubscriptionTabProps {
  organizationId: string;
}

export function SubscriptionTab({ organizationId }: SubscriptionTabProps) {
  const [changeTierTarget, setChangeTierTarget] = useState<{ id: string; code: string; name: string } | null>(null);

  const { data: subscription, isLoading: subLoading } = useOrgSubscription(organizationId);
  const { data: allTiers } = useSubscriptionTiers();
  const { data: allFeatures } = useTierFeatures();
  const changeTier = useChangeTier();

  if (subLoading) {
    return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!subscription) {
    return <div className="text-center py-12 text-muted-foreground">No active subscription found.</div>;
  }

  const currentTier = subscription.md_subscription_tiers as any;
  const currentCycle = subscription.md_billing_cycles as any;
  const currentModel = subscription.md_engagement_models as any;
  const challengeUsagePercent = subscription.challenge_limit_snapshot > 0
    ? Math.round((subscription.challenges_used / subscription.challenge_limit_snapshot) * 100)
    : 0;

  const changeType = changeTierTarget
    ? determineTierChangeType(currentTier?.code || '', changeTierTarget.code)
    : 'same';

  const handleConfirmTierChange = async () => {
    if (!changeTierTarget) return;
    await changeTier.mutateAsync({
      subscriptionId: subscription.id,
      organizationId,
      newTierId: changeTierTarget.id,
      isUpgrade: changeType === 'upgrade',
    });
    setChangeTierTarget(null);
  };

  const otherTiers = allTiers?.filter(t => t.id !== subscription.tier_id && !t.is_enterprise) ?? [];

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="text-primary">{TIER_ICONS[currentTier?.code] ?? <Zap className="h-5 w-5" />}</div>
              <h3 className="text-lg font-semibold text-foreground">{currentTier?.name ?? 'Unknown'} Plan</h3>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
            </div>
            {currentCycle && (
              <p className="text-sm text-muted-foreground">
                Billed {currentCycle.name} • {currentCycle.discount_percentage > 0 ? `${currentCycle.discount_percentage}% discount` : 'No discount'}
              </p>
            )}
            {currentModel && (
              <p className="text-sm text-muted-foreground">
                Engagement Model: <span className="font-medium text-foreground">{currentModel.name}</span>
              </p>
            )}
          </div>

          <div className="text-right space-y-1">
            {subscription.effective_monthly_cost != null && (
              <div className="text-2xl font-bold text-foreground">
                ${subscription.effective_monthly_cost.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </div>
            )}
            {subscription.auto_renew && (
              <Badge variant="outline" className="text-xs"><Calendar className="h-3 w-3 mr-1" />Auto-renew</Badge>
            )}
          </div>
        </div>

        {/* Period */}
        {subscription.current_period_start && subscription.current_period_end && (
          <div className="mt-4 text-sm text-muted-foreground">
            Current period: {format(new Date(subscription.current_period_start), 'MMM d, yyyy')} — {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
          </div>
        )}

        {/* Challenge Usage */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Challenges Used</span>
            <span className="font-medium text-foreground">{subscription.challenges_used} / {subscription.challenge_limit_snapshot}</span>
          </div>
          <Progress value={challengeUsagePercent} className="h-2" />
        </div>

        {/* Pending Downgrade */}
        {subscription.pending_downgrade_tier_id && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-foreground">
              Downgrade to {allTiers?.find(t => t.id === subscription.pending_downgrade_tier_id)?.name ?? 'lower tier'} scheduled for{' '}
              {subscription.pending_downgrade_date ? format(new Date(subscription.pending_downgrade_date), 'MMM d, yyyy') : 'next cycle'}.
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Tier Comparison */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Change Plan</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {otherTiers.map((tier) => {
            const type = determineTierChangeType(currentTier?.code || '', tier.code);
            const features = allFeatures?.filter(f => f.tier_id === tier.id).slice(0, 4) ?? [];

            return (
              <div key={tier.id} className="rounded-xl border border-border p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="text-primary">{TIER_ICONS[tier.code] ?? <Zap className="h-5 w-5" />}</div>
                  <h4 className="font-semibold text-foreground">{tier.name}</h4>
                  <Badge variant={type === 'upgrade' ? 'default' : 'secondary'} className="text-xs">
                    {type === 'upgrade' ? 'Upgrade' : 'Downgrade'}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  {tier.max_challenges && <div>Up to {tier.max_challenges} challenges/mo</div>}
                  {tier.max_users && <div>Up to {tier.max_users} users</div>}
                  {features.map(f => (
                    <div key={f.id}>✓ {f.feature_name}</div>
                  ))}
                </div>

                <Button
                  variant={type === 'upgrade' ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => setChangeTierTarget({ id: tier.id, code: tier.code, name: tier.name })}
                >
                  {type === 'upgrade' ? (
                    <><ArrowUpCircle className="mr-1 h-4 w-4" /> Upgrade to {tier.name}</>
                  ) : (
                    <><ArrowDownCircle className="mr-1 h-4 w-4" /> Downgrade to {tier.name}</>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!changeTierTarget} onOpenChange={(open) => !open && setChangeTierTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {changeType === 'upgrade' ? 'Upgrade' : 'Downgrade'} to {changeTierTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {changeType === 'upgrade'
                ? 'Your plan will be upgraded immediately. The new tier features will be available right away.'
                : 'Your plan will be downgraded at the end of your current billing cycle. You will retain current features until then.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTierChange} disabled={changeTier.isPending}>
              {changeTier.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm {changeType === 'upgrade' ? 'Upgrade' : 'Downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
