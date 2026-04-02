/**
 * BillingAddressFields — Billing contact + address form cards.
 * Extracted from BillingForm.tsx for decomposition.
 */

import { UseFormReturn } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CountrySelector } from './CountrySelector';
import type { BillingFormValues } from '@/lib/validations/billing';

interface BillingAddressFieldsProps {
  form: UseFormReturn<BillingFormValues>;
  billingStates: Array<{ id: string; name: string }> | undefined;
  statesLoading: boolean;
  watchedBillingCountryId: string;
}

export function BillingAddressFields({
  form, billingStates, statesLoading, watchedBillingCountryId,
}: BillingAddressFieldsProps) {
  return (
    <>
      {/* Billing Contact */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-base">Billing Contact</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField control={form.control} name="billing_entity_name" render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Contact Name *</FormLabel>
                <FormControl><Input {...field} placeholder="Company or dept name" className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="billing_email" render={({ field }) => (
              <FormItem>
                <FormLabel>Billing Email *</FormLabel>
                <FormControl><Input {...field} type="email" placeholder="billing@company.com" className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-base">Billing Address</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <FormField control={form.control} name="billing_address_line1" render={({ field }) => (
            <FormItem>
              <FormLabel>Street Address *</FormLabel>
              <FormControl><Input {...field} placeholder="123 Main Street" className="text-base" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField control={form.control} name="billing_city" render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="billing_state_province_id" render={({ field }) => (
              <FormItem>
                <FormLabel>State / Province</FormLabel>
                {statesLoading ? <Skeleton className="h-10 w-full" /> : (
                  <Select value={field.value || ''} onValueChange={field.onChange} disabled={!watchedBillingCountryId}>
                    <FormControl><SelectTrigger className="text-base"><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                    <SelectContent>{billingStates?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField control={form.control} name="billing_postal_code" render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP / Postal Code *</FormLabel>
                <FormControl><Input {...field} className="text-base" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="billing_country_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Country *</FormLabel>
                <FormControl><CountrySelector value={field.value} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
