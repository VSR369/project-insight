/**
 * OrgComplianceTab — Org compliance configuration form.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useOrgComplianceConfig, useUpsertOrgComplianceConfig } from '@/hooks/queries/useOrgComplianceConfig';
import { useOrgContext } from '@/contexts/OrgContext';

const schema = z.object({
  export_control_enabled: z.boolean().default(false),
  controlled_technology_default: z.boolean().default(false),
  data_residency_country: z.string().max(100).optional().default(''),
  gdpr_dpa_auto_attach: z.boolean().default(false),
  sanctions_screening_level: z.enum(['standard', 'enhanced']).default('standard'),
  compliance_officer_email: z.string().email().optional().or(z.literal('')).default(''),
});

type FormValues = z.infer<typeof schema>;

interface OrgComplianceTabProps { organizationId: string; }

export function OrgComplianceTab({ organizationId }: OrgComplianceTabProps) {
  const { organizationId: tenantId } = useOrgContext();
  const { data: config, isLoading } = useOrgComplianceConfig(organizationId);
  const upsertMut = useUpsertOrgComplianceConfig();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      export_control_enabled: false, controlled_technology_default: false,
      data_residency_country: '', gdpr_dpa_auto_attach: false,
      sanctions_screening_level: 'standard', compliance_officer_email: '',
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        export_control_enabled: config.export_control_enabled,
        controlled_technology_default: config.controlled_technology_default,
        data_residency_country: config.data_residency_country ?? '',
        gdpr_dpa_auto_attach: config.gdpr_dpa_auto_attach,
        sanctions_screening_level: config.sanctions_screening_level as 'standard' | 'enhanced',
        compliance_officer_email: config.compliance_officer_email ?? '',
      });
    }
  }, [config, form]);

  const onSubmit = (values: FormValues) => {
    upsertMut.mutate({
      organization_id: organizationId, tenant_id: tenantId,
      ...values,
      compliance_officer_email: values.compliance_officer_email || undefined,
      data_residency_country: values.data_residency_country || undefined,
    });
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Compliance Configuration</CardTitle>
        <CardDescription>Export control, data residency, and sanctions screening settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="export_control_enabled" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div><FormLabel>Export Control</FormLabel><p className="text-xs text-muted-foreground">Enable export control screening for challenges.</p></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="controlled_technology_default" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div><FormLabel>Controlled Technology</FormLabel><p className="text-xs text-muted-foreground">Default flag for controlled technology challenges.</p></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <FormField control={form.control} name="gdpr_dpa_auto_attach" render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div><FormLabel>GDPR DPA Auto-Attach</FormLabel><p className="text-xs text-muted-foreground">Automatically attach DPA for EU data challenges.</p></div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FormField control={form.control} name="data_residency_country" render={({ field }) => (
                <FormItem><FormLabel>Data Residency</FormLabel><FormControl><Input {...field} placeholder="e.g. US, EU, IN" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sanctions_screening_level" render={({ field }) => (
                <FormItem><FormLabel>Sanctions Screening</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="enhanced">Enhanced</SelectItem></SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="compliance_officer_email" render={({ field }) => (
              <FormItem><FormLabel>Compliance Officer Email</FormLabel><FormControl><Input {...field} type="email" placeholder="compliance@org.com" /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" disabled={upsertMut.isPending}>{upsertMut.isPending ? 'Saving…' : 'Save Compliance Config'}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
