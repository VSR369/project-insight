/**
 * PrizeTierCard — Individual prize tier card with toggle switch, amount input,
 * inline AI suggestion chip, and source badge.
 */

import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import SourceBadge from './SourceBadge';
import type { TierState } from '@/hooks/useRewardStructureState';

type TierRank = 'platinum' | 'gold' | 'silver';

interface PrizeTierCardProps {
  rank: TierRank;
  tier: TierState;
  currencySymbol: string;
  disabled?: boolean;
  error?: string;
  onToggle: (enabled: boolean) => void;
  onAmountChange: (amount: number) => void;
  onAcceptAI?: () => void;
}

const TIER_CONFIG: Record<TierRank, {
  icon: typeof Trophy;
  label: string;
  sublabel: string;
  cardBorder: string;
  iconClass: string;
}> = {
  platinum: {
    icon: Trophy,
    label: 'Platinum',
    sublabel: '1st Place',
    cardBorder: 'border-border',
    iconClass: 'text-muted-foreground',
  },
  gold: {
    icon: Medal,
    label: 'Gold',
    sublabel: '2nd Place',
    cardBorder: 'border-amber-200',
    iconClass: 'text-amber-500',
  },
  silver: {
    icon: Medal,
    label: 'Silver',
    sublabel: '3rd Place',
    cardBorder: 'border-border',
    iconClass: 'text-muted-foreground',
  },
};

export default function PrizeTierCard({
  rank,
  tier,
  currencySymbol,
  disabled = false,
  error,
  onToggle,
  onAmountChange,
  onAcceptAI,
}: PrizeTierCardProps) {
  const config = TIER_CONFIG[rank];
  const Icon = config.icon;
  const isRequired = rank === 'platinum';

  return (
    <div
      className={cn(
        'border rounded-xl px-4 py-3 mb-3 transition-all',
        config.cardBorder,
        tier.enabled ? 'bg-background' : 'bg-muted/30 opacity-60',
      )}
    >
      <div className="flex items-center gap-4">
        {/* Left: Icon + label + toggle */}
        <div className="w-28 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={cn('h-[18px] w-[18px]', config.iconClass)} />
            {isRequired && (
              <span className="text-[9px] font-semibold text-destructive uppercase">Required</span>
            )}
          </div>
          <p className="text-[14px] font-semibold text-foreground">{config.label}</p>
          <p className="text-[11px] text-muted-foreground">{config.sublabel}</p>
        </div>

        {/* Center: Toggle + Amount */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <Switch
              checked={tier.enabled}
              onCheckedChange={onToggle}
              disabled={disabled || isRequired}
              className="scale-75"
            />
            <span className="text-[11px] text-muted-foreground">
              {tier.enabled ? 'Enabled' : 'Disabled'}
            </span>
            {tier.enabled && (
              <SourceBadge source={tier.amountSrc} />
            )}
          </div>

          {tier.enabled ? (
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-semibold text-muted-foreground">
                {currencySymbol}
              </span>
              {disabled ? (
                <p className="text-[18px] font-semibold text-foreground tabular-nums">
                  {tier.amount.toLocaleString()}
                </p>
              ) : (
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={tier.amount || ''}
                  onChange={(e) => onAmountChange(Number(e.target.value) || 0)}
                  className="h-8 text-[18px] font-semibold border-0 border-b-2 border-border focus:border-primary rounded-none bg-transparent p-0"
                />
              )}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground italic">
              Enable tier to enter amount
            </p>
          )}

          {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
        </div>

        {/* Right: AI suggestion chip */}
        {tier.aiSuggestion != null && tier.aiSuggestion > 0 && (
          <div className="shrink-0 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-blue-500" />
            <span className="text-[11px] text-blue-600 font-medium">
              AI suggests: {currencySymbol}{tier.aiSuggestion.toLocaleString()}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onAcceptAI}
              className="h-6 px-2 text-[10px] text-blue-700 hover:bg-blue-100"
            >
              Accept
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
