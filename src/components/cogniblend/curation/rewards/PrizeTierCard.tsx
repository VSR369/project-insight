/**
 * PrizeTierCard — Individual prize tier card (Platinum/Gold/Silver/Honorable Mention).
 */

import { Trophy, Medal, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { PrizeTier } from '@/services/rewardStructureResolver';

type TierRank = PrizeTier['rank'];

interface PrizeTierCardProps {
  tier: PrizeTier;
  currencySymbol: string;
  editing: boolean;
  error?: string;
  onAmountChange: (amount: number) => void;
  onCountChange: (count: number) => void;
}

const TIER_CONFIG: Record<TierRank, {
  icon: typeof Trophy;
  label: string;
  sublabel: string;
  cardClass: string;
  iconClass: string;
  textClass: string;
  subClass: string;
}> = {
  platinum: {
    icon: Trophy,
    label: 'Platinum',
    sublabel: '1st Place',
    cardClass: 'bg-muted/50 border-border',
    iconClass: 'text-muted-foreground',
    textClass: 'text-foreground',
    subClass: 'text-muted-foreground',
  },
  gold: {
    icon: Medal,
    label: 'Gold',
    sublabel: '2nd Place',
    cardClass: 'bg-amber-50/50 border-amber-200',
    iconClass: 'text-amber-500',
    textClass: 'text-amber-800',
    subClass: 'text-amber-500',
  },
  silver: {
    icon: Medal,
    label: 'Silver',
    sublabel: '3rd Place',
    cardClass: 'bg-muted/30 border-border',
    iconClass: 'text-muted-foreground',
    textClass: 'text-foreground',
    subClass: 'text-muted-foreground',
  },
  honorable_mention: {
    icon: Star,
    label: 'Honorable Mention',
    sublabel: 'Recognition only',
    cardClass: 'bg-primary/5 border-primary/20',
    iconClass: 'text-primary/60',
    textClass: 'text-foreground',
    subClass: 'text-primary/60',
  },
};

export default function PrizeTierCard({
  tier,
  currencySymbol,
  editing,
  error,
  onAmountChange,
  onCountChange,
}: PrizeTierCardProps) {
  const config = TIER_CONFIG[tier.rank];
  const Icon = config.icon;
  const isHonorable = tier.rank === 'honorable_mention';

  return (
    <div className={cn('border rounded-xl px-4 py-3 mb-3', config.cardClass)}>
      <div className="flex items-center gap-4">
        {/* Left zone */}
        <div className="w-32 shrink-0">
          <Icon className={cn('h-[18px] w-[18px] mb-1', config.iconClass)} />
          <p className={cn('text-[14px] font-semibold', config.textClass)}>
            {config.label}
          </p>
          <p className={cn('text-[11px]', config.subClass)}>
            {config.sublabel}
          </p>
        </div>

        {/* Center zone — Prize Amount */}
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Prize Amount
          </p>
          {editing && !isHonorable ? (
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-semibold text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                type="number"
                min={0}
                step={100}
                value={tier.amount || ''}
                onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
                className="h-8 text-[18px] font-semibold border-0 border-b-2 border-border focus:border-primary rounded-none bg-transparent p-0"
              />
            </div>
          ) : (
            <p className="text-[18px] font-semibold text-foreground tabular-nums">
              {isHonorable ? '—' : `${currencySymbol}${tier.amount.toLocaleString()}`}
            </p>
          )}
          {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
          {isHonorable && (
            <p className="text-[11px] text-primary/60 mt-0.5">
              Recognition only — no cash prize
            </p>
          )}
        </div>

        {/* Right zone — Winner count */}
        <div className="w-32 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            No. of Winners
          </p>
          {editing ? (
            <Input
              type="number"
              min={1}
              step={1}
              value={tier.count || ''}
              onChange={(e) => onCountChange(Math.max(1, Math.round(Number(e.target.value) || 1)))}
              className="h-8 text-[18px] font-semibold border-0 border-b-2 border-border focus:border-primary rounded-none bg-transparent p-0 text-center"
            />
          ) : (
            <p className="text-[18px] font-semibold text-foreground text-center tabular-nums">
              {tier.count}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
