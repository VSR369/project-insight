/**
 * Membership Tier Selector (REG-004)
 * 
 * Allows users to optionally select a membership tier (Annual / Multi-Year)
 * during plan selection. Shows discount benefits for per-challenge fees.
 * 
 * Business Rules: BR-MEM-001, BR-MEM-003
 */

import { Calendar, Award, X as XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { calculateMembershipDiscount } from '@/services/membershipService';

interface MembershipTier {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

interface MembershipTierSelectorProps {
  tiers: MembershipTier[];
  selectedTierId: string | undefined;
  onSelect: (tierId: string | undefined) => void;
}

const TIER_META: Record<string, { icon: React.ReactNode; accentClass: string; months: number }> = {
  annual: {
    icon: <Calendar className="h-5 w-5" />,
    accentClass: 'border-primary text-primary',
    months: 12,
  },
  multi_year: {
    icon: <Award className="h-5 w-5" />,
    accentClass: 'border-amber-500 text-amber-600 dark:text-amber-400',
    months: 24,
  },
};

export function MembershipTierSelector({ tiers, selectedTierId, onSelect }: MembershipTierSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Membership Plan (Optional)</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add a membership to save on per-challenge fees. You can also add this later.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {tiers.map((tier) => {
          const meta = TIER_META[tier.code] ?? TIER_META.annual;
          const discount = calculateMembershipDiscount(tier.code, false);
          const isSelected = selectedTierId === tier.id;

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSelect(isSelected ? undefined : tier.id)}
              className={cn(
                'relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
                isSelected
                  ? `${meta.accentClass} shadow-md ring-2 ring-primary/20 bg-primary/5`
                  : 'border-border hover:border-muted-foreground/30',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'p-1.5 rounded-md',
                  isSelected ? 'bg-primary/10' : 'bg-muted',
                )}>
                  {meta.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">{tier.name}</span>
                    {tier.code === 'multi_year' && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0">
                        BEST VALUE
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {tier.description ?? `${meta.months}-month commitment`}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-emerald-600 font-medium">{discount.feeDiscountPct}% off</span>
                      <span className="text-muted-foreground">per-challenge fees</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-emerald-600 font-medium">{discount.commissionRatePct}% less</span>
                      <span className="text-muted-foreground">commission rate</span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* No Membership Option */}
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          className={cn(
            'relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
            !selectedTierId
              ? 'border-muted-foreground/50 shadow-md bg-muted/30'
              : 'border-border border-dashed hover:border-muted-foreground/30',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-md bg-muted">
              <XIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm text-foreground">No Membership</span>
              <p className="text-xs text-muted-foreground mt-1">
                Continue without a membership. Standard challenge fees apply. You can add membership later.
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
