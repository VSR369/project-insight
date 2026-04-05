/**
 * OrgFinanceTab — Org finance/escrow configuration form.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useOrgFinanceConfig, useUpsertOrgFinanceConfig } from '@/hooks/queries/useOrgFinanceConfig';
import { useOrgContext } from '@/contexts/OrgContext';

const schema = z.object({
  default_bank_name: z.string().max(200).optional().default(''),
  default_bank_branch: z.string().max(200).optional().default(''),
  default_bank_address: z.string().max(500).optional().default(''),
  preferred_escrow_currency: z.string().min(3).max(3).default('USD'),
  auto_deposit_enabled: z.boolean().default(false),
  budget_approval_url: z.string().url().optional().or(z.literal('')).default(''),
});

type FormValues = z.infer<typeof schema>;

interface OrgFinanceTabProps { organizationId: string; }

export function OrgFinanceTab({ organizationId }: OrgFinanceTabProps) {
  const { organizationId: tenantId } = useOrgContext();
  const { data: config, isLoading } = useOrgFinanceConfig(organizationId);
  const upsertMut = useUpsertOrgFinanceConfig();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      default_bank_name: '', default_bank_branch: '', default_bank_address: '',
      preferred_escrow_currency: 'USD', auto_deposit_enabled: false, budget_approval_url: '',
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        default_bank_name: config.default_bank_name ?? '',
        default_bank_branch: config.default_bank_branch ?? '',
        default_bank_address: config.default_bank_address ?? '',
        preferred_escrow_currency: config.preferred_escrow_currency ?? 'USD',
        auto_deposit_enabled: config.auto_deposit_enabled ?? false,
        budget_approval_url: config.budget_approval_url ?? '',
      });
    }
  }, [config, form]);

  const onSubmit = (values: FormValues) => {
    upsertMut.mutate({
      organization_id: organizationId,
      tenant_id: tenantId,
      ...values,
      budget_approval_url: values.budget_approval_url || undefined,
    });
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" />Finance Configuration</CardTitle>
        <CardDescription>Default banking and escrow preferences for your organization.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField control={form.control} name="default_bank_name" render={({ field }) => (
                <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} placeholder="e.g. JPMorgan Chase" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="default_bank_branch" render={({ field }) => (
                <FormItem><FormLabel>Branch</FormLabel><FormControl><Input {...field} placeholder="Branch name" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="default_bank_address" render={({ field }) => (
              <FormItem><FormLabel>Bank Address</FormLabel><FormControl><Input {...field} placeholder="Full bank address" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField control={form.control} name="preferred_escrow_currency" render={({ field }) => (
                <FormItem><FormLabel>Preferred Currency</FormLabel><FormControl><Input {...field} maxLength={3} placeholder="USD" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="budget_approval_url" render={({ field }) => (
                <FormItem><FormLabel>Budget Approval URL</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="auto_deposit_enabled" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div><FormLabel>Auto-Deposit</FormLabel><p className="text-xs text-muted-foreground">Automatically initiate escrow deposits when challenges are published.</p></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <Button type="submit" disabled={upsertMut.isPending}>{upsertMut.isPending ? 'Saving…' : 'Save Finance Config'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
