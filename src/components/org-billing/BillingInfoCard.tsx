/**
 * BillingInfoCard (Phase 10b.3)
 *
 * Edit surface for `seeker_billing_info`: billing entity, email, address,
 * PO number, tax ID. Country/state Selects are deferred (TODO) — text
 * fields are sufficient for the MVP and unblock invoice generation.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useOrgBillingInfo,
  useUpsertOrgBillingInfo,
} from '@/hooks/queries/useOrgBillingInfo';

const schema = z.object({
  billing_entity_name: z.string().max(200).optional().or(z.literal('')),
  billing_email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  billing_address_line1: z.string().max(255).optional().or(z.literal('')),
  billing_address_line2: z.string().max(255).optional().or(z.literal('')),
  billing_city: z.string().max(100).optional().or(z.literal('')),
  billing_postal_code: z.string().max(20).optional().or(z.literal('')),
  po_number: z.string().max(100).optional().or(z.literal('')),
  tax_id: z.string().max(100).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  billing_entity_name: '',
  billing_email: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_city: '',
  billing_postal_code: '',
  po_number: '',
  tax_id: '',
};

interface Props {
  organizationId: string;
  tenantId: string;
}

export function BillingInfoCard({ organizationId, tenantId }: Props) {
  const { data: info, isLoading } = useOrgBillingInfo(organizationId);
  const upsert = useUpsertOrgBillingInfo();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (info) {
      form.reset({
        billing_entity_name: info.billing_entity_name ?? '',
        billing_email: info.billing_email ?? '',
        billing_address_line1: info.billing_address_line1 ?? '',
        billing_address_line2: info.billing_address_line2 ?? '',
        billing_city: info.billing_city ?? '',
        billing_postal_code: info.billing_postal_code ?? '',
        po_number: info.po_number ?? '',
        tax_id: info.tax_id ?? '',
      });
    }
  }, [info, form]);

  const onSubmit = (values: FormValues) => {
    upsert.mutate({
      organization_id: organizationId,
      tenant_id: tenantId,
      billing_entity_name: values.billing_entity_name || null,
      billing_email: values.billing_email || null,
      billing_address_line1: values.billing_address_line1 || null,
      billing_address_line2: values.billing_address_line2 || null,
      billing_city: values.billing_city || null,
      billing_postal_code: values.billing_postal_code || null,
      po_number: values.po_number || null,
      tax_id: values.tax_id || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Billing Information
        </CardTitle>
        <CardDescription>
          Entity, address, and tax details used on invoices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField control={form.control} name="billing_entity_name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing entity</FormLabel>
                    <FormControl><Input {...field} placeholder="Legal billing name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="billing_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing email</FormLabel>
                    <FormControl><Input {...field} type="email" placeholder="ap@org.com" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="billing_address_line1" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address line 1</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="billing_address_line2" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address line 2</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField control={form.control} name="billing_city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="billing_postal_code" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal code</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* TODO(post-MVP): billing_country_id + billing_state_province_id Selects (need master data hooks) */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <FormField control={form.control} name="po_number" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO number</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="tax_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax ID</FormLabel>
                    <FormControl><Input {...field} placeholder="VAT / GSTIN / EIN" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={upsert.isPending || !form.formState.isDirty}
                >
                  {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save billing info
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
