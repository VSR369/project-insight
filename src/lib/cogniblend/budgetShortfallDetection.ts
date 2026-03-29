/**
 * Budget Shortfall Detection — pure function that detects when
 * seeker budget < minimum viable reward from rate card.
 *
 * Returns null if no shortfall, otherwise returns revision strategy.
 */

import type { ChallengeContext } from './challengeContextAssembler';

export type RevisionStrategy =
  | 'add_non_monetary'
  | 'reduce_scope'
  | 'reduce_maturity'
  | 'fundamental_rescope';

export interface BudgetShortfallResult {
  originalBudget: number;
  minimumViableReward: number;
  gap: number;
  gapPercentage: number;
  strategy: RevisionStrategy;
  requiresAMApproval: boolean;
  strategyDescription: string;
}

function getStrategyDescription(strategy: RevisionStrategy): string {
  switch (strategy) {
    case 'add_non_monetary':
      return 'Keep scope unchanged. Bridge gap with non-monetary incentives (mentorship, IP licensing, advisory seats).';
    case 'reduce_scope':
      return 'Mark 1–2 deliverables as optional. Reduce complexity on 1–2 dimensions. Add non-monetary for remaining gap.';
    case 'reduce_maturity':
      return 'Downgrade maturity level (e.g., POC → Blueprint). Remove production/deployment deliverables. Recalculate all downstream sections.';
    case 'fundamental_rescope':
      return 'Budget covers only a fraction of minimum. Recommend seeker discussion before proceeding.';
  }
}

/**
 * Detect budget shortfall by comparing total prize pool against rate card floor.
 *
 * @returns BudgetShortfallResult if shortfall exists, null otherwise.
 */
export function detectBudgetShortfall(
  context: ChallengeContext,
): BudgetShortfallResult | null {
  if (!context.rateCard) return null;

  const minimumViableReward = context.rateCard.rewardFloorAmount;
  if (minimumViableReward <= 0) return null;

  const originalBudget = context.totalPrizePool ?? 0;
  if (originalBudget <= 0) return null; // No budget set yet — nothing to compare

  if (originalBudget >= minimumViableReward) return null; // No shortfall

  const gap = minimumViableReward - originalBudget;
  const gapPercentage = Math.round((gap / minimumViableReward) * 100);

  let strategy: RevisionStrategy;
  if (gapPercentage <= 20) {
    strategy = 'add_non_monetary';
  } else if (gapPercentage <= 40) {
    strategy = 'reduce_scope';
  } else if (gapPercentage <= 60) {
    strategy = 'reduce_maturity';
  } else {
    strategy = 'fundamental_rescope';
  }

  return {
    originalBudget,
    minimumViableReward,
    gap,
    gapPercentage,
    strategy,
    requiresAMApproval: true,
    strategyDescription: getStrategyDescription(strategy),
  };
}
