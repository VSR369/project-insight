import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';

interface SubscriptionDetailCardProps {
  subscription: any;
  billing: any;
}

function Field({ label, value }: { label: string; value?: string | number | null | boolean }) {
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value ?? '—');
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{String(display)}</p>
    </div>
  );
}

export function SubscriptionDetailCard({ subscription, billing }: SubscriptionDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Plan & Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {subscription ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Field label="Subscription Tier" value={subscription.md_subscription_tiers?.name} />
            <Field label="Billing Cycle" value={subscription.md_billing_cycles?.name} />
            <Field label="Engagement Model" value={subscription.md_engagement_models?.name} />
            <Field label="Payment Type" value={subscription.payment_type} />
            <Field label="Monthly Base" value={subscription.monthly_base_price ? `$${subscription.monthly_base_price}` : null} />
            <Field label="Discount" value={subscription.discount_percentage ? `${subscription.discount_percentage}%` : '0%'} />
            <Field label="Effective Monthly" value={subscription.effective_monthly_cost ? `$${subscription.effective_monthly_cost}` : null} />
            <Field label="Status" value={subscription.status} />
            <Field label="Auto-Renew" value={subscription.auto_renew} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No subscription data.</p>
        )}

        {billing && (
          <>
            <h4 className="text-sm font-semibold border-t pt-4">Billing Details</h4>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Field label="Billing Entity" value={billing.billing_entity_name} />
              <Field label="Payment Method" value={billing.payment_method} />
              <Field label="Billing Email" value={billing.billing_email} />
              <Field label="PO Number" value={billing.po_number} />
              <Field label="Tax ID" value={billing.tax_id} />
              <Field label="Tax ID Verified" value={billing.tax_id_verified} />
              <div className="lg:col-span-3">
                <p className="text-xs text-muted-foreground">Billing Address</p>
                <p className="text-sm">
                  {[billing.billing_address_line1, billing.billing_address_line2, billing.billing_city, billing.billing_postal_code, billing.countries?.name].filter(Boolean).join(', ') || '—'}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
