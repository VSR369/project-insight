import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApproveBilling } from '@/hooks/queries/useSeekerOrgApprovals';
import { ReviewField } from './ReviewField';
import type { SeekerSubscription, SeekerBilling } from './types';

const billingVerificationSchema = z.object({
  bank_transaction_id: z.string().min(1, 'Bank Transaction ID is required').max(100),
  bank_name: z.string().min(1, 'Bank Name is required').max(200),
  payment_received_date: z.string().min(1, 'Payment received date is required'),
  notes: z.string().max(500).optional(),
});

type BillingVerificationValues = z.infer<typeof billingVerificationSchema>;

interface SubscriptionDetailCardProps {
  subscription: SeekerSubscription | null;
  billing: SeekerBilling | null;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'verified':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Verified</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300">Pending</Badge>;
  }
}

/** Displays subscription plan and billing details with payment verification form. */
export function SubscriptionDetailCard({ subscription, billing }: SubscriptionDetailCardProps) {
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const approveBilling = useApproveBilling();

  const form = useForm<BillingVerificationValues>({
    resolver: zodResolver(billingVerificationSchema),
    defaultValues: { bank_transaction_id: '', bank_name: '', payment_received_date: '', notes: '' },
  });

  const onSubmit = async (data: BillingVerificationValues) => {
    if (!billing) return;
    await approveBilling.mutateAsync({
      billingId: billing.id,
      bankTransactionId: data.bank_transaction_id,
      bankName: data.bank_name,
      paymentReceivedDate: data.payment_received_date,
      notes: data.notes,
    });
    setShowVerifyForm(false);
    form.reset();
  };

  const verificationStatus = billing?.billing_verification_status ?? 'pending';
  const isVerified = verificationStatus === 'verified';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Plan & Billing
          {billing && <span className="ml-auto">{getStatusBadge(verificationStatus)}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {subscription ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ReviewField label="Subscription Tier" value={subscription.md_subscription_tiers?.name} />
            <ReviewField label="Billing Cycle" value={subscription.md_billing_cycles?.name} />
            <ReviewField label="Engagement Model" value={subscription.md_engagement_models?.name} />
            <ReviewField label="Payment Type" value={subscription.payment_type} />
            <ReviewField label="Monthly Base" value={subscription.monthly_base_price ? `$${subscription.monthly_base_price}` : null} />
            <ReviewField label="Discount" value={subscription.discount_percentage ? `${subscription.discount_percentage}%` : '0%'} />
            <ReviewField label="Effective Monthly" value={subscription.effective_monthly_cost ? `$${subscription.effective_monthly_cost}` : null} />
            <ReviewField label="Status" value={subscription.status} />
            <ReviewField label="Auto-Renew" value={subscription.auto_renew} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subscription data.</p>
        )}

        {billing && (
          <>
            <h4 className="text-sm font-semibold border-t pt-4">Billing Details</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <ReviewField label="Billing Entity" value={billing.billing_entity_name} />
              <ReviewField label="Payment Method" value={billing.payment_method} />
              <ReviewField label="Billing Email" value={billing.billing_email} />
              <ReviewField label="PO Number" value={billing.po_number} />
              <ReviewField label="Tax ID" value={billing.tax_id} />
              <ReviewField label="Tax ID Verified" value={billing.tax_id_verified} />
              <div className="lg:col-span-3">
                <p className="text-xs text-muted-foreground">Billing Address</p>
                <p className="text-sm">
                  {[billing.billing_address_line1, billing.billing_address_line2, billing.billing_city, billing.billing_postal_code, billing.countries?.name].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </div>

            {isVerified && (
              <>
                <h4 className="text-sm font-semibold border-t pt-4 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Payment Verification Details
                </h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <ReviewField label="Bank Transaction ID" value={billing.bank_transaction_id} />
                  <ReviewField label="Bank Name" value={billing.bank_name} />
                  <ReviewField label="Payment Received Date" value={billing.payment_received_date} />
                  {billing.billing_verification_notes && (
                    <div className="lg:col-span-3">
                      <ReviewField label="Verification Notes" value={billing.billing_verification_notes} />
                    </div>
                  )}
                  <ReviewField label="Verified At" value={billing.billing_verified_at ? new Date(billing.billing_verified_at).toLocaleString() : null} />
                </div>
              </>
            )}

            {!isVerified && !showVerifyForm && (
              <Button onClick={() => setShowVerifyForm(true)} className="mt-2">
                <CheckCircle className="h-4 w-4 mr-1" /> Verify Payment
              </Button>
            )}

            {!isVerified && showVerifyForm && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <h4 className="text-sm font-semibold">Payment Verification</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="bank_transaction_id">Bank Transaction ID *</Label>
                    <Input id="bank_transaction_id" {...form.register('bank_transaction_id')} />
                    {form.formState.errors.bank_transaction_id && (
                      <p className="text-xs text-destructive">{form.formState.errors.bank_transaction_id.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bank_name">Bank Name *</Label>
                    <Input id="bank_name" {...form.register('bank_name')} />
                    {form.formState.errors.bank_name && (
                      <p className="text-xs text-destructive">{form.formState.errors.bank_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="payment_received_date">Payment Received Date *</Label>
                    <Input id="payment_received_date" type="date" {...form.register('payment_received_date')} />
                    {form.formState.errors.payment_received_date && (
                      <p className="text-xs text-destructive">{form.formState.errors.payment_received_date.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes">Comments (optional)</Label>
                  <Textarea id="notes" rows={2} {...form.register('notes')} placeholder="Any additional notes about the payment..." />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={approveBilling.isPending}>
                    {approveBilling.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Confirm Verification
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowVerifyForm(false); form.reset(); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
