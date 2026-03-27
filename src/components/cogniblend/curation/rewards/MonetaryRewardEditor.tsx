/**
 * MonetaryRewardEditor — Redesigned with 3 fixed tier cards (Platinum/Gold/Silver),
 * toggle switches, per-field source badges, and inline AI suggestions.
 */

import { useMemo, useCallback } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TierState } from '@/hooks/useRewardStructureState';
import PrizeTierCard from './PrizeTierCard';
import AIRecommendationsPanel from './AIRecommendationsPanel';
import type { ValidationError } from '@/lib/rewardValidation';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD', 'AUD'] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$',
};

interface MonetaryRewardEditorProps {
  tierStates: Record<string, TierState>;
  currency: string;
  totalPool?: number;
  errors: ValidationError[];
  disabled?: boolean;
  onUpdateTier: (rank: string, patch: Partial<TierState>) => void;
  onCurrencyChange: (currency: string) => void;
  onAcceptAISuggestion: (rank: string) => void;
  onAcceptAllAI?: () => void;
  onApplyAITiers?: () => void;
  onApplyAIAmounts?: () => void;
  onReviewWithAI?: () => void;
  aiLoading?: boolean;
  hasAISuggestions?: boolean;
  aiRationale?: string;
  hasBeenReviewed?: boolean;
}

export default function MonetaryRewardEditor({
  tierStates,
  currency,
  totalPool,
  errors,
  disabled = false,
  onUpdateTier,
  onCurrencyChange,
  onAcceptAISuggestion,
  onAcceptAllAI,
  onApplyAITiers,
  onApplyAIAmounts,
  onReviewWithAI,
  aiLoading = false,
  hasAISuggestions = false,
  aiRationale,
}: MonetaryRewardEditorProps) {
  const currSym = CURRENCY_SYMBOLS[currency] ?? '$';

  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  // Compute current total
  const currentTotal = useMemo(() => {
    return Object.values(tierStates)
      .filter((t) => t.enabled)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [tierStates]);

  return (
    <div className="space-y-4">
      {/* Currency selector */}
      <div className="flex items-center gap-3">
        <label className="text-[12px] font-medium text-muted-foreground">Currency</label>
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          disabled={disabled}
          className="border border-border rounded-lg px-3 py-2 text-[13px] font-medium text-foreground w-[80px] bg-background disabled:opacity-50"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Three fixed tier cards */}
      {(['platinum', 'gold', 'silver'] as const).map((rank) => (
        <PrizeTierCard
          key={rank}
          rank={rank}
          tier={tierStates[rank]}
          currencySymbol={currSym}
          disabled={disabled}
          error={getError(`${rank}.amount`) || getError(`${rank}.enabled`)}
          onToggle={(enabled) => onUpdateTier(rank, { enabled })}
          onAmountChange={(amount) => onUpdateTier(rank, { amount })}
          onAcceptAI={() => onAcceptAISuggestion(rank)}
        />
      ))}

      {/* Total summary */}
      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-muted-foreground">Total Prize Pool</span>
          <span className="text-[16px] font-semibold text-foreground tabular-nums">
            {currSym}{currentTotal.toLocaleString()}
          </span>
        </div>
        {totalPool != null && totalPool > 0 && currentTotal !== totalPool && (
          <p className={cn(
            'text-[11px] mt-1',
            currentTotal > totalPool ? 'text-destructive' : 'text-amber-600',
          )}>
            {currentTotal > totalPool
              ? `${currSym}${(currentTotal - totalPool).toLocaleString()} over budget`
              : `${currSym}${(totalPool - currentTotal).toLocaleString()} unallocated`}
          </p>
        )}
        {getError('totalPool') && (
          <p className="text-[11px] text-destructive mt-1">{getError('totalPool')}</p>
        )}
      </div>

      {/* AI Recommendations Panel */}
      {hasAISuggestions && (
        <AIRecommendationsPanel
          type="monetary"
          onAcceptAll={onAcceptAllAI}
          onApplyTiers={onApplyAITiers}
          onApplyAmounts={onApplyAIAmounts}
          rationale={aiRationale}
        />
      )}

      {/* Review with AI button */}
      {onReviewWithAI && !disabled && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onReviewWithAI}
            disabled={aiLoading}
            className="gap-1.5 text-xs"
          >
            {aiLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            Review with AI
          </Button>
        </div>
      )}
    </div>
  );
}
