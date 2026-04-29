/**
 * AgreementOverridesFields — Numeric overrides + governance mode + MSA URL.
 * Wired into challenge/seat/storage limits via `useEnterpriseLimits`.
 */

import type { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { AgreementFormValues } from './agreementFormSchema';

interface Props {
  form: UseFormReturn<AgreementFormValues>;
}

export function AgreementOverridesFields({ form }: Props) {
  return (
    <>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <Label>Max Challenges Override</Label>
          <Input type="number" {...form.register('max_challenges_override')} />
          <p className="text-[11px] text-muted-foreground mt-1">
            Overrides tier default once agreement is active.
          </p>
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
                v === '__none' ? null : (v as AgreementFormValues['governance_mode_override']),
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
    </>
  );
}
