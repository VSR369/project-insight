/**
 * AgreementEditorForm — Platform admin editor for an Enterprise agreement.
 * Handles both create (no `agreement` prop) and update.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useSubscriptionTiers } from '@/hooks/queries/usePlanSelectionData';
import {
  type EnterpriseAgreement,
  useEnterpriseFeatureGateKeys,
  useUpsertEnterpriseAgreement,
} from '@/hooks/queries/useEnterpriseAgreement';

const schema = z.object({
  organization_id: z.string().uuid(),
  tier_id: z.string().uuid('Select an Enterprise tier'),
  acv_amount: z.coerce.number().nonnegative().nullable(),
  currency_code: z.string().length(3, 'ISO 4217 (3 letters)').toUpperCase(),
  billing_cadence: z.enum(['annual', 'multi_year', 'custom']),
  contract_start_date: z.string().nullable(),
  contract_end_date: z.string().nullable(),
  max_challenges_override: z.coerce.number().int().positive().nullable(),
  max_users_override: z.coerce.number().int().positive().nullable(),
  max_storage_gb_override: z.coerce.number().int().positive().nullable(),
  governance_mode_override: z.enum(['QUICK', 'STRUCTURED', 'CONTROLLED']).nullable(),
  msa_document_url: z.string().url('Must be a URL').nullable().or(z.literal('')),
  notes: z.string().max(2000).nullable(),
  feature_gates: z.record(z.boolean()),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  organizationId: string;
  agreement: EnterpriseAgreement | null;
  onSaved?: (id: string) => void;
}

function emptyDefaults(orgId: string): FormValues {
  return {
    organization_id: orgId,
    tier_id: '',
    acv_amount: null,
    currency_code: 'USD',
    billing_cadence: 'annual',
    contract_start_date: null,
    contract_end_date: null,
    max_challenges_override: null,
    max_users_override: null,
    max_storage_gb_override: null,
    governance_mode_override: null,
    msa_document_url: '',
    notes: null,
    feature_gates: {},
  };
}

function fromAgreement(a: EnterpriseAgreement): FormValues {
  return {
    organization_id: a.organization_id,
    tier_id: a.tier_id,
    acv_amount: a.acv_amount,
    currency_code: a.currency_code,
    billing_cadence: (a.billing_cadence as FormValues['billing_cadence']) ?? 'annual',
    contract_start_date: a.contract_start_date,
    contract_end_date: a.contract_end_date,
    max_challenges_override: a.max_challenges_override,
    max_users_override: a.max_users_override,
    max_storage_gb_override: a.max_storage_gb_override,
    governance_mode_override:
      (a.governance_mode_override as FormValues['governance_mode_override']) ?? null,
    msa_document_url: a.msa_document_url ?? '',
    notes: a.notes,
    feature_gates: (a.feature_gates ?? {}) as Record<string, boolean>,
  };
}

export function AgreementEditorForm({ organizationId, agreement, onSaved }: Props) {
  const { data: tiers } = useSubscriptionTiers();
  const { data: gates } = useEnterpriseFeatureGateKeys();
  const upsert = useUpsertEnterpriseAgreement();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: agreement ? fromAgreement(agreement) : emptyDefaults(organizationId),
  });

  const enterpriseTiers = (tiers ?? []).filter((t) => t.is_enterprise);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      msa_document_url: values.msa_document_url ? values.msa_document_url : null,
    };
    const saved = await upsert.mutateAsync(
      agreement ? { id: agreement.id, ...payload } : payload,
    );
    onSaved?.(saved.id);
  };

  const gateValues = form.watch('feature_gates');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Tier + commercial */}
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
            onValueChange={(v) => form.setValue('billing_cadence', v as FormValues['billing_cadence'])}
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

      <Separator />

      {/* Overrides */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <Label>Max Challenges Override</Label>
          <Input type="number" {...form.register('max_challenges_override')} />
        </div>
        <div>
          <Label>Max Users Override</Label>
          <Input type="number" {...form.register('max_users_override')} />
        </div>
        <div>
          <Label>Max Storage (GB) Override</Label>
          <Input type="number" {...form.register('max_storage_gb_override')} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <Label>Governance Mode Override</Label>
          <Select
            value={form.watch('governance_mode_override') ?? '__none'}
            onValueChange={(v) =>
              form.setValue(
                'governance_mode_override',
                v === '__none' ? null : (v as FormValues['governance_mode_override']),
              )
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None (use tier default)</SelectItem>
              <SelectItem value="QUICK">QUICK</SelectItem>
              <SelectItem value="STRUCTURED">STRUCTURED</SelectItem>
              <SelectItem value="CONTROLLED">CONTROLLED</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>MSA Document URL</Label>
          <Input type="url" placeholder="https://..." {...form.register('msa_document_url')} />
        </div>
      </section>

      <Separator />

      {/* Feature gates */}
      <section>
        <h4 className="text-sm font-semibold mb-3">Feature Gates</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {(gates ?? []).map((g) => (
            <label key={g.key} className="flex items-start gap-3 rounded-md border border-border p-3">
              <Switch
                checked={gateValues?.[g.key] === true}
                onCheckedChange={(checked) =>
                  form.setValue('feature_gates', { ...(gateValues ?? {}), [g.key]: checked })
                }
              />
              <div className="space-y-1 min-w-0">
                <div className="text-sm font-medium">{g.display_name}</div>
                {g.description && (
                  <div className="text-xs text-muted-foreground">{g.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      </section>

      <Separator />

      <div>
        <Label>Notes</Label>
        <Textarea rows={3} {...form.register('notes')} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting || upsert.isPending}>
          {agreement ? 'Save changes' : 'Create agreement'}
        </Button>
      </div>
    </form>
  );
}
