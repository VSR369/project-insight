/**
 * MembershipPage — Membership status, discounts, auto-renewal management
 * Phase 6: MEM-001
 */

import { useState } from 'react';

import { useOrgContext } from '@/contexts/OrgContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Crown, Calendar, Percent, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import {
  useMembershipTiers,
  useOrgMembership,
  useMembershipHistory,
  useCreateMembership,
  useToggleAutoRenew,
  useCancelMembership,
} from '@/hooks/queries/useMembershipData';
import { validateMembershipRenewal, calculateMembershipDiscount } from '@/services/membershipService';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  expired: 'secondary',
  cancelled: 'destructive',
  suspended: 'outline',
};

export default function MembershipPage() {
  const { organizationId, tenantId, isInternalDepartment } = useOrgContext();

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  const { data: tiers, isLoading: tiersLoading } = useMembershipTiers();
  const { data: membership, isLoading: membershipLoading } = useOrgMembership(organizationId);
  const { data: history, isLoading: historyLoading } = useMembershipHistory(organizationId);

  const createMembership = useCreateMembership();
  const toggleAutoRenew = useToggleAutoRenew();
  const cancelMembership = useCancelMembership();

  const isLoading = tiersLoading || membershipLoading;

  const renewalInfo = membership
    ? validateMembershipRenewal(membership.ends_at, membership.lifecycle_status)
    : null;

  const discountInfo = membership?.md_membership_tiers
    ? calculateMembershipDiscount(
        (membership.md_membership_tiers as { code: string }).code,
        isInternalDepartment,
      )
    : null;

  const handleEnroll = () => {
    if (!selectedTierId) return;
    const tier = tiers?.find(t => t.id === selectedTierId);
    if (!tier) return;

    createMembership.mutate({
      organization_id: organizationId,
      tenant_id: tenantId,
      membership_tier_id: selectedTierId,
      fee_discount_pct: tier.fee_discount_pct,
      commission_rate_pct: tier.commission_rate_pct,
    });
    setEnrollDialogOpen(false);
  };

  const handleCancelMembership = () => {
    if (!membership) return;
    cancelMembership.mutate({
      membershipId: membership.id,
      organizationId,
      reason: cancelReason,
    });
    setCancelDialogOpen(false);
    setCancelReason('');
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Membership Management</h1>
        <p className="text-muted-foreground mt-1">Manage your organization's membership tier, discounts, and renewal settings</p>
      </div>
      <div className="space-y-6">
        {/* Current Membership Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              Current Membership
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : membership ? (
              <div className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Tier</Label>
                    <p className="font-semibold text-lg">
                      {(membership.md_membership_tiers as { name: string })?.name ?? 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-1">
                      <Badge variant={STATUS_VARIANTS[membership.lifecycle_status] ?? 'secondary'}>
                        {membership.lifecycle_status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Fee Discount</Label>
                    <p className="font-semibold text-lg flex items-center gap-1">
                      <Percent className="h-4 w-4 text-primary" />
                      {membership.fee_discount_pct}%
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Expires</Label>
                    <p className="font-semibold">
                      {membership.ends_at
                        ? format(new Date(membership.ends_at), 'MMM dd, yyyy')
                        : 'No expiry set'}
                    </p>
                    {renewalInfo && renewalInfo.daysUntilExpiry <= 30 && renewalInfo.daysUntilExpiry > 0 && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        Expires in {renewalInfo.daysUntilExpiry} days
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={membership.auto_renew}
                      onCheckedChange={(checked) =>
                        toggleAutoRenew.mutate({
                          membershipId: membership.id,
                          autoRenew: checked,
                          organizationId,
                        })
                      }
                      disabled={toggleAutoRenew.isPending}
                    />
                    <div>
                      <Label className="font-medium">Auto-Renewal</Label>
                      <p className="text-xs text-muted-foreground">
                        {membership.auto_renew
                          ? 'Membership will automatically renew'
                          : 'Membership will expire at end of term'}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setCancelDialogOpen(true)}
                    disabled={membership.lifecycle_status !== 'active'}
                  >
                    Cancel Membership
                  </Button>
                </div>

                {discountInfo && (
                  <>
                    <Separator />
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="font-medium mb-2">Your Discounts</h4>
                      <div className="grid gap-2 lg:grid-cols-2 text-sm">
                        <div>Challenge Fee Discount: <span className="font-semibold text-primary">{discountInfo.feeDiscountPct}%</span></div>
                        <div>Commission Rate: <span className="font-semibold text-primary">{discountInfo.commissionRatePct}%</span></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">No active membership</p>
                <Button onClick={() => setEnrollDialogOpen(true)}>
                  <Crown className="mr-2 h-4 w-4" />
                  Enroll in Membership
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Membership Tiers */}
        {!membership && (
          <div className="grid gap-4 lg:grid-cols-2">
            {tiers?.map((tier) => (
              <Card key={tier.id} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div>Duration: <span className="font-medium">{tier.duration_months} months</span></div>
                    <div>Fee Discount: <span className="font-medium text-primary">{tier.fee_discount_pct}%</span></div>
                    <div>Commission Rate: <span className="font-medium">{tier.commission_rate_pct}%</span></div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => { setSelectedTierId(tier.id); setEnrollDialogOpen(true); }}
                  >
                    Select {tier.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Membership History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Membership History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history && history.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Discount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {(m.md_membership_tiers as { name: string })?.name ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[m.lifecycle_status] ?? 'secondary'} className="text-xs">
                          {m.lifecycle_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(m.starts_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.ends_at ? format(new Date(m.ends_at), 'MMM dd, yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{m.fee_discount_pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-6">No membership history</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll in Membership</DialogTitle>
            <DialogDescription>
              {selectedTierId
                ? `Confirm enrollment in ${tiers?.find(t => t.id === selectedTierId)?.name} membership`
                : 'Select a membership tier to continue'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEnroll} disabled={!selectedTierId || createMembership.isPending}>
              {createMembership.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Membership</DialogTitle>
            <DialogDescription>
              This will cancel your active membership. Discounts will no longer apply after the current period.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reason for cancellation</Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Optional: tell us why..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Membership</Button>
            <Button variant="destructive" onClick={handleCancelMembership} disabled={cancelMembership.isPending}>
              {cancelMembership.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrgLayout>
  );
}
