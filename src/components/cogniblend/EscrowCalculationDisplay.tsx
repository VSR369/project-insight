/**
 * EscrowCalculationDisplay — Read-only escrow calculation for Creator form (MP model).
 * Shows: Prize Pool → Platform Fee → Total Fee → Escrow Deposit
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useGovernanceModeConfig } from '@/hooks/queries/useGovernanceModeConfig';
import { DollarSign } from 'lucide-react';
import type { GovernanceMode } from '@/lib/governanceMode';

interface EscrowCalculationDisplayProps {
  prizePlatinum: number;
  currencyCode: string;
  governanceMode: GovernanceMode;
  platformFeePct?: number;
  consultingFee?: number;
  managementFee?: number;
  onConfirm?: (confirmed: boolean) => void;
  confirmed?: boolean;
}

export function EscrowCalculationDisplay({
  prizePlatinum,
  currencyCode,
  governanceMode,
  platformFeePct = 10,
  consultingFee = 0,
  managementFee = 0,
  onConfirm,
  confirmed = false,
}: EscrowCalculationDisplayProps) {
  const { data: modeConfig, isLoading } = useGovernanceModeConfig(governanceMode);
  const escrowPct = modeConfig?.escrow_deposit_pct ?? 100;

  const calc = useMemo(() => {
    const prizePool = prizePlatinum;
    const platformFee = prizePool * (platformFeePct / 100);
    const totalFee = consultingFee + managementFee + platformFee;
    const escrowDeposit = totalFee * (escrowPct / 100);
    return { prizePool, platformFee, totalFee, escrowDeposit };
  }, [prizePlatinum, platformFeePct, consultingFee, managementFee, escrowPct]);

  const fmt = (n: number) => `${currencyCode} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Escrow Calculation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Prize Pool</span>
          <span className="text-right font-mono">{fmt(calc.prizePool)}</span>

          <span className="text-muted-foreground">Platform Fee ({platformFeePct}%)</span>
          <span className="text-right font-mono">{fmt(calc.platformFee)}</span>

          {consultingFee > 0 && (
            <>
              <span className="text-muted-foreground">Consulting Fee</span>
              <span className="text-right font-mono">{fmt(consultingFee)}</span>
            </>
          )}
          {managementFee > 0 && (
            <>
              <span className="text-muted-foreground">Management Fee</span>
              <span className="text-right font-mono">{fmt(managementFee)}</span>
            </>
          )}

          <span className="font-medium border-t pt-1">Total Fee</span>
          <span className="text-right font-mono font-medium border-t pt-1">{fmt(calc.totalFee)}</span>

          <span className="font-semibold text-primary">Escrow Deposit ({escrowPct}%)</span>
          <span className="text-right font-mono font-semibold text-primary">{fmt(calc.escrowDeposit)}</span>
        </div>

        {onConfirm && (
          <div className="flex items-start gap-2 pt-2 border-t">
            <Checkbox id="escrow-confirm" checked={confirmed} onCheckedChange={(v) => onConfirm(v === true)} />
            <Label htmlFor="escrow-confirm" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
              I confirm budget availability for the escrow deposit of {fmt(calc.escrowDeposit)}
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
