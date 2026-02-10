/**
 * Internal Billing Notice (BR-SAAS-003)
 * 
 * Gate component shown on billing pages for internal departments
 * (subsidiaries under a SaaS parent). Explains that billing is
 * managed by the parent org and shows shadow usage summary.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Info } from 'lucide-react';

interface InternalBillingNoticeProps {
  parentOrgName?: string;
  shadowChargePerChallenge?: number;
  shadowCurrencyCode?: string;
  challengesUsed?: number;
}

export function InternalBillingNotice({
  parentOrgName = 'Parent Organization',
  shadowChargePerChallenge = 0,
  shadowCurrencyCode = 'USD',
  challengesUsed = 0,
}: InternalBillingNoticeProps) {
  const totalShadowCost = shadowChargePerChallenge * challengesUsed;

  return (
    <div className="space-y-4">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription>
          Your department's billing is managed by <strong>{parentOrgName}</strong>.
          No direct payment is required. Usage is tracked for internal cost allocation.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />
            Shadow Usage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Challenges Used</p>
              <p className="text-2xl font-bold text-foreground">{challengesUsed}</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Shadow Rate</p>
              <p className="text-2xl font-bold text-foreground">
                {shadowCurrencyCode} {shadowChargePerChallenge.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary">Total Shadow Cost</p>
              <p className="text-2xl font-bold text-primary">
                {shadowCurrencyCode} {totalShadowCost.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
