/**
 * AgreementCommercialFields — Tier + ACV/currency + cadence + dates.
 * Pure presentational; receives the parent RHF instance.
 */

import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useSubscriptionTiers } from '@/hooks/queries/usePlanSelectionData';
import type { AgreementFormValues } from './agreementFormSchema';

interface Props {
  form: UseFormReturn<AgreementFormValues>;
}

export function AgreementCommercialFields({ form }: Props) {
  const { data: tiers } = useSubscriptionTiers();
  const enterpriseTiers = (tiers ?? []).filter((t) => t.is_enterprise);

  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <Label>Enterprise Tier</Label>
          <Select
            value={form.watch('tier_id')}
            onValueChange={(v) => form.setValue('tier_id', v, { shouldValidate: true })}
          >
            <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
            <SelectContent>
              {enterpriseTiers.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.tier_id && (
            <p className="text-xs text-destructive mt-1">{form.formState.errors.tier_id.message}</p>
          )}
        </div>
        <div>
          <Label>ACV Amount</Label>
          <Input type="number" step="0.01" {...form.register('acv_amount')} />
        </div>
        <div>
          <Label>Currency (ISO 4217)</Label>
          <Input maxLength={3} {...form.register('currency_code')} />
          {form.formState.errors.currency_code && (
            <p className="text-xs text-destructive mt-1">
              {form.formState.errors.currency_code.message}
            </p>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <Label>Billing Cadence</Label>
          <Select
            value={form.watch('billing_cadence')}
            onValueChange={(v) =>
              form.setValue('billing_cadence', v as AgreementFormValues['billing_cadence'])
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="annual">Annual</SelectItem>
              <SelectItem value="multi_year">Multi-year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Contract Start</Label>
          <Input type="date" {...form.register('contract_start_date')} />
        </div>
        <div>
          <Label>Contract End</Label>
          <Input type="date" {...form.register('contract_end_date')} />
        </div>
      </section>
    </>
  );
}
