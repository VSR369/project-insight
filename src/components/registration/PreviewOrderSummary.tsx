/**
 * Order Summary Card — Registration Preview
 *
 * Replicates the BillingForm order summary pricing logic
 * for read-only display on the preview page.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Receipt, Tag, Percent, DollarSign } from 'lucide-react';

interface OrderSummaryProps {
  tierName: string;
  cycleName: string;
  cycleMonths: number;
  membershipName?: string;
  currencySymbol: string;
  baseMonthly: number;
  cycleDiscount: number;
  subsidizedPct: number;
  effectiveMonthly: number;
  membershipFee: number;
  dueToday: number;
  isInternalDept: boolean;
}

function fmt(symbol: string, amount: number) {
  return `${symbol}${amount.toFixed(2)}`;
}

export function PreviewOrderSummary({
  tierName, cycleName, cycleMonths, membershipName,
  currencySymbol, baseMonthly, cycleDiscount, subsidizedPct,
  effectiveMonthly, membershipFee, dueToday, isInternalDept,
}: OrderSummaryProps) {
  const s = currencySymbol;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" /> Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Tier + Cycle */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subscription Plan</span>
          <span className="font-medium text-foreground">{tierName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Billing Cycle</span>
          <span className="text-foreground">{cycleName}</span>
        </div>

        <Separator />

        {/* Base price */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base Monthly Price</span>
          <span className="text-foreground">{fmt(s, baseMonthly)}</span>
        </div>

        {/* Cycle discount */}
        {cycleDiscount > 0 && (
          <div className="flex justify-between text-primary">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" /> Billing Cycle Discount
            </span>
            <span>−{cycleDiscount}%</span>
          </div>
        )}

        {/* Subsidized discount */}
        {subsidizedPct > 0 && (
          <div className="flex justify-between text-primary">
            <span className="flex items-center gap-1">
              <Percent className="h-3 w-3" /> Subsidized Discount
            </span>
            <span>−{subsidizedPct}%</span>
          </div>
        )}

        {/* Effective monthly */}
        <div className="flex justify-between font-medium">
          <span className="text-muted-foreground">Effective Monthly Cost</span>
          <span className="text-foreground">{fmt(s, effectiveMonthly)}</span>
        </div>

        {/* Subscription subtotal */}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subscription ({cycleMonths} mo)</span>
          <span className="text-foreground">{fmt(s, effectiveMonthly * cycleMonths)}</span>
        </div>

        {/* Membership */}
        {membershipName && (
          <>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Membership ({membershipName})</span>
              <span className="text-foreground">{fmt(s, membershipFee)}</span>
            </div>
          </>
        )}

        <Separator />

        {/* Due Today */}
        <div className="flex justify-between text-base font-bold">
          <span className="text-foreground flex items-center gap-1">
            <DollarSign className="h-4 w-4" /> Due Today
          </span>
          {isInternalDept ? (
            <Badge variant="secondary">Internal — $0.00</Badge>
          ) : (
            <span className="text-primary">{fmt(s, dueToday)}</span>
          )}
        </div>

        {/* Usage note */}
        <p className="text-xs text-muted-foreground pt-1">
          Per-challenge fees and platform commissions are billed on usage. Tax: not applicable at registration.
        </p>
      </CardContent>
    </Card>
  );
}
