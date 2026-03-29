/**
 * EffectiveSolverValue — Summary display of cash + non-monetary total.
 */

import { Sparkles } from 'lucide-react';
import type { ChallengeIncentiveSelection } from '@/hooks/queries/useChallengeIncentiveSelections';

interface EffectiveSolverValueProps {
  cashPool: number;
  currencySymbol: string;
  selections: ChallengeIncentiveSelection[];
}

export default function EffectiveSolverValue({
  cashPool,
  currencySymbol,
  selections,
}: EffectiveSolverValueProps) {
  const nonMonetaryMidpoint = selections.reduce((sum, sel) => {
    if (!sel.incentive) return sum;
    return sum + (sel.incentive.cash_equivalent_min + sel.incentive.cash_equivalent_max) / 2;
  }, 0);

  if (nonMonetaryMidpoint === 0 && cashPool === 0) return null;

  const total = cashPool + nonMonetaryMidpoint;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
      <Sparkles className="h-4 w-4 text-primary shrink-0" />
      <span className="text-xs font-medium text-foreground">
        Effective solver value:{' '}
        <span className="tabular-nums">
          {currencySymbol}{cashPool.toLocaleString()} cash
        </span>
        {nonMonetaryMidpoint > 0 && (
          <>
            {' + ~'}
            <span className="tabular-nums">
              {currencySymbol}{Math.round(nonMonetaryMidpoint).toLocaleString()} non-monetary
            </span>
          </>
        )}
        {' = ~'}
        <span className="tabular-nums font-semibold">
          {currencySymbol}{Math.round(total).toLocaleString()} total
        </span>
      </span>
    </div>
  );
}
