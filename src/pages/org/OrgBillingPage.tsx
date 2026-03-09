import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOrgSubscription, useOrgInvoices, useOrgTopUps, usePurchaseTopUp } from '@/hooks/queries/useBillingData';
import { computeUsageSummary, validateTopUp } from '@/services/billingService';
import { InternalBillingNotice } from '@/components/registration/InternalBillingNotice';
import { ShadowUsageSummary } from '@/components/org-settings/ShadowUsageSummary';
import { useOrgContext } from '@/contexts/OrgContext';

import { CreditCard, Receipt, TrendingUp, Package, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

export default function OrgBillingPage() {
  const { organizationId, tenantId, isInternalDepartment } = useOrgContext();

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpQty, setTopUpQty] = useState(5);

  const { data: subscription, isLoading: subLoading } = useOrgSubscription(organizationId);
  const { data: invoices, isLoading: invLoading } = useOrgInvoices(organizationId);
  const { data: topUps } = useOrgTopUps(organizationId);
  const purchaseTopUp = usePurchaseTopUp();

  const usage = subscription ? computeUsageSummary(
    subscription.challenges_used ?? 0,
    subscription.challenge_limit_snapshot,
    subscription.per_challenge_fee_snapshot ?? 0
  ) : null;

  const topUpValidation = validateTopUp({
    quantity: topUpQty,
    perChallengeFee: subscription?.per_challenge_fee_snapshot ?? 0,
    currencyCode: subscription?.shadow_currency_code ?? 'USD',
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-primary/10 text-primary border-primary/20">Paid</Badge>;
      case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
      case 'issued': return <Badge variant="secondary">Issued</Badge>;
      case 'draft': return <Badge variant="outline">Draft</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="text-muted-foreground mt-1">Monitor challenge usage, invoices, and purchase top-ups</p>
      </div>
      {!isInternalDepartment && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setTopUpOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Buy Top-Up
          </Button>
        </div>
      )}

      {/* BR-SAAS-003: Internal Department Billing Gate */}
      {isInternalDepartment && (
        <>
          <InternalBillingNotice
            parentOrgName="Parent Organization"
            shadowChargePerChallenge={subscription?.per_challenge_fee_snapshot ?? 0}
            shadowCurrencyCode={subscription?.shadow_currency_code ?? 'USD'}
            challengesUsed={subscription?.challenges_used ?? 0}
          />
          <ShadowUsageSummary
            challengesUsed={subscription?.challenges_used ?? 0}
            challengeLimit={subscription?.challenge_limit_snapshot ?? null}
            shadowChargePerChallenge={subscription?.per_challenge_fee_snapshot ?? 0}
            currencyCode={subscription?.shadow_currency_code ?? 'USD'}
            periodStart={subscription?.current_period_start ?? undefined}
            periodEnd={subscription?.current_period_end ?? undefined}
          />
        </>
      )}

      {/* Usage Summary */}
      {subLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Challenges Used</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {usage?.challengesUsed ?? 0}
                <span className="text-lg text-muted-foreground ml-1">/ {usage?.challengeLimit ?? '∞'}</span>
              </div>
              {usage?.usagePercentage !== null && usage?.usagePercentage !== undefined && (
                <Progress value={usage.usagePercentage} className="mt-3" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Remaining</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {usage?.remaining ?? '∞'}
              </div>
              {usage?.remaining !== null && usage?.remaining === 0 && (
                <div className="flex items-center gap-1 mt-2 text-sm text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  No challenges remaining
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">Est. Period Cost</span>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {subscription?.shadow_currency_code ?? 'USD'} {usage?.estimatedCost?.toLocaleString() ?? '0'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs: Invoices / Top-Ups */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" /> Invoices</TabsTrigger>
          <TabsTrigger value="topups"><Package className="h-4 w-4 mr-1" /> Top-Ups</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Billing history for your organization</CardDescription>
            </CardHeader>
            <CardContent>
              {invLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !invoices?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No invoices yet.</p>
                </div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                          <TableCell><Badge variant="outline">{inv.invoice_type}</Badge></TableCell>
                          <TableCell>{statusBadge(inv.status)}</TableCell>
                          <TableCell className="font-medium">{inv.currency_code} {inv.total_amount?.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.issued_at ? format(new Date(inv.issued_at), 'MMM d, yyyy') : '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.due_at ? format(new Date(inv.due_at), 'MMM d, yyyy') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topups">
          <Card>
            <CardHeader>
              <CardTitle>Challenge Top-Ups</CardTitle>
              <CardDescription>Additional challenge packages purchased</CardDescription>
            </CardHeader>
            <CardContent>
              {!topUps?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No top-ups purchased yet.</p>
                </div>
              ) : (
                <div className="relative w-full overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Qty</TableHead>
                        <TableHead>Per Challenge</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topUps.map((tu) => (
                        <TableRow key={tu.id}>
                          <TableCell className="font-medium">{tu.quantity}</TableCell>
                          <TableCell>{tu.currency_code} {tu.per_challenge_fee}</TableCell>
                          <TableCell className="font-medium">{tu.currency_code} {tu.total_amount?.toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline">{tu.payment_status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(tu.created_at), 'MMM d, yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Top-Up Dialog */}
      <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Challenge Top-Up</DialogTitle>
            <DialogDescription>Add more challenges to your current billing period</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Number of Challenges</Label>
              <Input type="number" min={1} max={100} value={topUpQty} onChange={(e) => setTopUpQty(parseInt(e.target.value) || 1)} />
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Per challenge fee</span>
              <span className="font-medium">{subscription?.shadow_currency_code ?? 'USD'} {subscription?.per_challenge_fee_snapshot ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total</span>
              <span className="text-lg font-bold text-primary">{subscription?.shadow_currency_code ?? 'USD'} {topUpValidation.totalAmount.toLocaleString()}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                purchaseTopUp.mutate({
                  organizationId,
                  tenantId,
                  quantity: topUpQty,
                  perChallengeFee: subscription?.per_challenge_fee_snapshot ?? 0,
                  currencyCode: subscription?.shadow_currency_code ?? 'USD',
                  billingPeriodStart: subscription?.current_period_start ?? new Date().toISOString(),
                  billingPeriodEnd: subscription?.current_period_end ?? new Date().toISOString(),
                });
                setTopUpOpen(false);
              }}
              disabled={!topUpValidation.isValid || purchaseTopUp.isPending}
            >
              {purchaseTopUp.isPending ? 'Processing...' : 'Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrgLayout>
  );
}
