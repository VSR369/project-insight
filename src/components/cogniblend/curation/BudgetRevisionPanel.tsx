/**
 * BudgetRevisionPanel — Shown when budget shortfall is detected after Wave 5.
 *
 * Displays gap analysis and recommended strategy with three actions:
 * Accept & Send to AM, Modify Manually, Reject.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, AlertTriangle, ArrowRight } from 'lucide-react';
import type { BudgetShortfallResult } from '@/lib/cogniblend/budgetShortfallDetection';

interface BudgetRevisionPanelProps {
  shortfall: BudgetShortfallResult;
  currencyCode?: string;
  onAcceptAndSendToAM: () => void;
  onModifyManually: () => void;
  onReject: () => void;
}

const STRATEGY_LABELS: Record<string, { label: string; color: string }> = {
  add_non_monetary: { label: 'Add Non-Monetary Incentives', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  reduce_scope: { label: 'Reduce Scope', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  reduce_maturity: { label: 'Reduce Maturity Level', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  fundamental_rescope: { label: 'Fundamental Rescope Required', color: 'bg-red-100 text-red-800 border-red-300' },
};

export function BudgetRevisionPanel({
  shortfall,
  currencyCode = 'USD',
  onAcceptAndSendToAM,
  onModifyManually,
  onReject,
}: BudgetRevisionPanelProps) {
  const strategyInfo = STRATEGY_LABELS[shortfall.strategy] ?? STRATEGY_LABELS.add_non_monetary;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode, maximumFractionDigits: 0 }).format(n);

  return (
    <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-amber-600" />
          Budget Revision Recommended
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Key figures */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Seeker Budget</p>
            <p className="font-semibold text-foreground">{fmt(shortfall.originalBudget)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Minimum Reward</p>
            <p className="font-semibold text-foreground">{fmt(shortfall.minimumViableReward)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gap</p>
            <p className="font-semibold text-destructive">{fmt(shortfall.gap)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gap %</p>
            <p className="font-semibold text-destructive">{shortfall.gapPercentage}%</p>
          </div>
        </div>

        {/* Strategy */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Recommended strategy:</span>
          </div>
          <Badge className={`${strategyInfo.color} text-xs`}>
            {strategyInfo.label}
          </Badge>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {shortfall.strategyDescription}
          </p>
        </div>

        {shortfall.requiresAMApproval && (
          <div className="flex items-start gap-2 rounded-md bg-amber-100/50 dark:bg-amber-900/20 px-2 py-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              Requires Creator approval before proceeding.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button size="sm" onClick={onAcceptAndSendToAM}>
            Accept &amp; Send to AM
          </Button>
          <Button variant="outline" size="sm" onClick={onModifyManually}>
            Modify Manually
          </Button>
          <Button variant="ghost" size="sm" onClick={onReject}>
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
