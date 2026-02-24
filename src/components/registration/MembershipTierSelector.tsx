/**
 * Membership Tier Selector (REG-004)
 * 
 * Allows users to optionally select a membership tier (Annual / Multi-Year)
 * during plan selection. Shows pricing, discount benefits, and selected state.
 * 
 * Business Rules: BR-MEM-001, BR-MEM-003
 */

import { Calendar, Award, X as XIcon, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface MembershipTier {
  id: string;
  code: string;
  name: string;
  description: string | null;
  annual_fee_usd: number | null;
  duration_months: number | null;
  fee_discount_pct: number | null;
  commission_rate_pct: number | null;
}

interface MembershipTierSelectorProps {
  tiers: MembershipTier[];
  selectedTierId: string | undefined;
  onSelect: (tierId: string | undefined) => void;
  currencySymbol?: string;
}

const TIER_META: Record<string, { icon: React.ReactNode; accentClass: string; selectedBg: string }> = {
  annual: {
    icon: <Calendar className="h-5 w-5" />,
    accentClass: 'border-primary text-primary',
    selectedBg: 'bg-primary/5',
  },
  multi_year: {
    icon: <Award className="h-5 w-5" />,
    accentClass: 'border-amber-500 text-amber-600 dark:text-amber-400',
    selectedBg: 'bg-amber-50 dark:bg-amber-950/20',
  },
};

export function MembershipTierSelector({ tiers, selectedTierId, onSelect, currencySymbol = '$' }: MembershipTierSelectorProps) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Membership Plan (Optional)</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add a membership to save on per-challenge fees. Billed separately from your subscription.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {tiers.map((tier) => {
          const meta = TIER_META[tier.code] ?? TIER_META.annual;
          const isSelected = selectedTierId === tier.id;
          const fee = tier.annual_fee_usd;
          const months = tier.duration_months ?? (tier.code === 'multi_year' ? 24 : 12);
          const durationLabel = months >= 24 ? `${months / 12} years` : 'year';
          const feeDiscount = tier.fee_discount_pct ?? 0;
          const commissionRate = tier.commission_rate_pct ?? 0;

          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onSelect(isSelected ? undefined : tier.id)}
              className={cn(
                'relative rounded-lg border-2 p-4 text-left transition-all hover:shadow-md',
                isSelected
                  ? `${meta.accentClass} shadow-md ring-2 ring-primary/20 ${meta.selectedBg}`
                  : 'border-border hover:border-muted-foreground/30',
              )}
            >
              {/* Selected badge */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Selected
                  </Badge>
                </div>
              )}

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

                  {/* Price */}
                  {fee != null && (
                    <p className="text-lg font-bold text-foreground mb-1">
                      {currencySymbol}{fee.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/{durationLabel}</span>
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mb-2">
                    {tier.description ?? `${months}-month commitment`}
                  </p>

                  <div className="space-y-1">
                    {feeDiscount > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-emerald-600 font-medium">{feeDiscount}% off</span>
                        <span className="text-muted-foreground">per-challenge fees</span>
                      </div>
                    )}
                    {commissionRate > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-emerald-600 font-medium">{commissionRate}% less</span>
                        <span className="text-muted-foreground">commission rate</span>
                      </div>
                    )}
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
          {!selectedTierId && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Selected
              </Badge>
            </div>
          )}
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
