/**
 * EscrowCalculationDisplay — Governance-aware escrow calculation for Creator form.
 * QUICK: hidden. STRUCTURED: optional toggle. CONTROLLED: mandatory with lock icon.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useGovernanceModeConfig } from '@/hooks/queries/useGovernanceModeConfig';
import { DollarSign, Lock } from 'lucide-react';
import { EscrowModeBanner } from './EscrowModeBanner';
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
  onEscrowToggle?: (enabled: boolean) => void;
  escrowEnabled?: boolean;
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
  onEscrowToggle,
  escrowEnabled: escrowEnabledProp,
}: EscrowCalculationDisplayProps) {
  const [localEnabled, setLocalEnabled] = useState(false);
  const { data: modeConfig, isLoading } = useGovernanceModeConfig(governanceMode);
  const escrowPct = modeConfig?.escrow_deposit_pct ?? 100;

  const escrowMode = governanceMode === 'CONTROLLED'
    ? 'mandatory'
    : governanceMode === 'STRUCTURED'
      ? 'optional'
      : 'not_applicable';

  const isMandatory = escrowMode === 'mandatory';
  const escrowEnabled = isMandatory
    ? true
    : (escrowEnabledProp ?? localEnabled);

  const handleToggle = (enabled: boolean) => {
    setLocalEnabled(enabled);
    onEscrowToggle?.(enabled);
  };

  const calc = useMemo(() => {
    const prizePool = prizePlatinum;
    const platformFee = prizePool * (platformFeePct / 100);
    const totalFee = consultingFee + managementFee + platformFee;
    const escrowDeposit = totalFee * (escrowPct / 100);
    return { prizePool, platformFee, totalFee, escrowDeposit };
  }, [prizePlatinum, platformFeePct, consultingFee, managementFee, escrowPct]);

  const fmt = (n: number) =>
    `${currencyCode} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (escrowMode === 'not_applicable') return null;
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const titleSuffix = isMandatory ? '(Required)' : '(Optional)';

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Escrow Calculation {titleSuffix}
          {isMandatory && <Lock className="h-3.5 w-3.5 text-destructive" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <EscrowModeBanner
          escrowMode={escrowMode}
          escrowEnabled={escrowEnabled}
          onEscrowToggle={isMandatory ? undefined : handleToggle}
        />

        <div className={`grid grid-cols-2 gap-2 text-sm transition-opacity ${escrowEnabled ? 'opacity-100' : 'opacity-40'}`}>
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

        {!escrowEnabled && (
          <p className="text-xs text-muted-foreground italic">
            Escrow not enabled — direct payment will be used.
          </p>
        )}

        {escrowEnabled && onConfirm && (
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
