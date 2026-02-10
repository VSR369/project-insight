/**
 * Tier Comparison Modal (ORG-001)
 * 
 * Side-by-side tier comparison for upgrade/downgrade decisions.
 * Shows features, limits, pricing differences.
 */

import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, X, ArrowRight, Crown, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TierInfo {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  max_challenges: number | null;
  max_users: number | null;
  is_enterprise: boolean;
}

interface TierFeature {
  id: string;
  tier_id: string;
  feature_name: string;
  feature_value?: string | null;
}

interface TierComparisonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: TierInfo;
  targetTier: TierInfo;
  currentFeatures: TierFeature[];
  targetFeatures: TierFeature[];
  isUpgrade: boolean;
  onConfirm: () => void;
  isPending?: boolean;
  proratedCharge?: number | null;
  currencyCode?: string;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  basic: <Zap className="h-5 w-5" />,
  standard: <Star className="h-5 w-5" />,
  premium: <Crown className="h-5 w-5" />,
};

export function TierComparisonModal({
  open,
  onOpenChange,
  currentTier,
  targetTier,
  currentFeatures,
  targetFeatures,
  isUpgrade,
  onConfirm,
  isPending = false,
  proratedCharge,
  currencyCode = 'USD',
}: TierComparisonModalProps) {
  // Merge all unique feature names
  const allFeatureNames = Array.from(new Set([
    ...currentFeatures.map(f => f.feature_name),
    ...targetFeatures.map(f => f.feature_name),
  ]));

  const TierColumn = ({ tier, features, isCurrent }: { tier: TierInfo; features: TierFeature[]; isCurrent: boolean }) => (
    <div className={cn(
      'flex-1 rounded-xl border p-4 space-y-3',
      isCurrent ? 'border-border bg-muted/30' : 'border-primary bg-primary/5',
    )}>
      <div className="flex items-center gap-2">
        <div className={isCurrent ? 'text-muted-foreground' : 'text-primary'}>
          {TIER_ICONS[tier.code] ?? <Zap className="h-5 w-5" />}
        </div>
        <h4 className="font-semibold text-foreground">{tier.name}</h4>
        {isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
        {!isCurrent && (
          <Badge variant={isUpgrade ? 'default' : 'secondary'} className="text-xs">
            {isUpgrade ? 'Upgrade' : 'Downgrade'}
          </Badge>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Challenges</span>
          <span className="font-medium text-foreground">{tier.max_challenges ?? '∞'}/mo</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Users</span>
          <span className="font-medium text-foreground">{tier.max_users ?? '∞'}</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-1.5">
        {allFeatureNames.map((featureName) => {
          const hasFeature = features.some(f => f.feature_name === featureName);
          return (
            <div key={featureName} className="flex items-center gap-2 text-sm">
              {hasFeature ? (
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={hasFeature ? 'text-foreground' : 'text-muted-foreground/60 line-through'}>
                {featureName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            Compare Plans: {currentTier.name} vs {targetTier.name}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? 'Review what you gain by upgrading your plan.'
              : 'Review what changes when downgrading your plan.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            <TierColumn tier={currentTier} features={currentFeatures} isCurrent={true} />
            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground hidden lg:block" />
              <ArrowRight className="h-6 w-6 text-muted-foreground rotate-90 lg:hidden" />
            </div>
            <TierColumn tier={targetTier} features={targetFeatures} isCurrent={false} />
          </div>

          {proratedCharge != null && proratedCharge > 0 && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <span className="text-muted-foreground">Prorated charge for remaining period: </span>
              <span className="font-bold text-primary">{currencyCode} {proratedCharge.toLocaleString()}</span>
            </div>
          )}

          {!isUpgrade && (
            <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
              Downgrade takes effect at the end of your current billing cycle. You retain current features until then.
            </div>
          )}
        </div>

        <div className="shrink-0 flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            variant={isUpgrade ? 'default' : 'outline'}
          >
            {isUpgrade ? `Upgrade to ${targetTier.name}` : `Downgrade to ${targetTier.name}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
