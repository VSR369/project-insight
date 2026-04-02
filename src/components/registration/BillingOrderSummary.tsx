/**
 * BillingOrderSummary — Right-column order summary for billing step.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props {
  selectedTierName?: string;
  selectedTierCode?: string;
  selectedCycleName?: string;
  currencySymbol: string;
  baseMonthly: number;
  cycleDiscount: number;
  subsidizedPct: number;
  effectiveMonthly: number;
  selectedMembership?: { name: string; fee_discount_pct: number | null } | null;
  membershipFee: number;
  dueToday: number;
  isInternalDept: boolean;
}

export function BillingOrderSummary({
  selectedTierName, selectedTierCode, selectedCycleName,
  currencySymbol, baseMonthly, cycleDiscount, subsidizedPct,
  effectiveMonthly, selectedMembership, membershipFee,
  dueToday, isInternalDept,
}: Props) {
  return (
    <div className="sticky top-8">
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-sm">{selectedTierName ?? 'Plan'}</p>
              <p className="text-xs text-muted-foreground">{selectedCycleName ?? 'Monthly'} billing</p>
            </div>
            <Badge variant="outline" className="text-xs">{selectedTierCode}</Badge>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Price</span>
              <span className="text-foreground">{currencySymbol}{baseMonthly.toFixed(2)}/mo</span>
            </div>
            {cycleDiscount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Billing discount</span><span>-{cycleDiscount}%</span>
              </div>
            )}
            {subsidizedPct > 0 && (
              <div className="flex justify-between text-primary">
                <span>Subsidized discount</span><span>-{subsidizedPct}%</span>
              </div>
            )}
            {(cycleDiscount > 0 || subsidizedPct > 0) && (
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Subscription subtotal</span>
                <span className="text-foreground">{currencySymbol}{effectiveMonthly.toFixed(2)}/mo</span>
              </div>
            )}

            <Separator className="my-1" />

            {selectedMembership ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{selectedMembership.name}</span>
                  <span className="text-foreground">{currencySymbol}{membershipFee.toFixed(2)}</span>
                </div>
                <p className="text-xs text-primary">
                  Includes {selectedMembership.fee_discount_pct ?? 0}% off per-challenge fees
                </p>
              </div>
            ) : (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Membership</span>
                <span className="text-muted-foreground text-xs">not selected</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Per-Challenge Fees</span>
              <span className="text-muted-foreground text-xs">billed on usage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="text-muted-foreground text-xs">not applicable</span>
            </div>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="font-semibold text-foreground">Due Today</span>
            <span className="text-lg font-bold text-foreground">{currencySymbol}{dueToday.toFixed(2)}</span>
          </div>

          {isInternalDept && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2">
              Shadow billing — no actual charge.
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center pt-2">
            Subscription renews automatically.{selectedMembership ? ' Membership fee is annual.' : ''} You can cancel anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
