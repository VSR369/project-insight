/**
 * AgreementFeatureGatesMatrix — Lookup-driven Switch grid.
 * Keys are validated against md_enterprise_feature_gate_keys at write-time
 * by the `validate_feature_gate_keys` trigger (Phase 10c.6).
 */

import type { UseFormReturn } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { useEnterpriseFeatureGateKeys } from '@/hooks/queries/useEnterpriseAgreement';
import type { AgreementFormValues } from './agreementFormSchema';

interface Props {
  form: UseFormReturn<AgreementFormValues>;
}

export function AgreementFeatureGatesMatrix({ form }: Props) {
  const { data: gates } = useEnterpriseFeatureGateKeys();
  const gateValues = form.watch('feature_gates');

  return (
    <section>
      <h4 className="text-sm font-semibold mb-3">Feature Gates</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(gates ?? []).map((g) => (
          <label
            key={g.key}
            className="flex items-start gap-3 rounded-md border border-border p-3"
          >
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
  );
}
