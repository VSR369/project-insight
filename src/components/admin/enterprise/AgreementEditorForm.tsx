/**
 * AgreementEditorForm — Platform admin editor for an Enterprise agreement.
 * Composition layer only: schema + sub-sections live in sibling files
 * to keep this host under the 250-LOC cap.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  type EnterpriseAgreement,
  useUpsertEnterpriseAgreement,
} from '@/hooks/queries/useEnterpriseAgreement';
import {
  agreementFormSchema,
  agreementToFormValues,
  emptyAgreementDefaults,
  type AgreementFormValues,
} from './agreementFormSchema';
import { AgreementCommercialFields } from './AgreementCommercialFields';
import { AgreementOverridesFields } from './AgreementOverridesFields';
import { AgreementFeatureGatesMatrix } from './AgreementFeatureGatesMatrix';

interface Props {
  organizationId: string;
  agreement: EnterpriseAgreement | null;
  onSaved?: (id: string) => void;
}

export function AgreementEditorForm({ organizationId, agreement, onSaved }: Props) {
  const upsert = useUpsertEnterpriseAgreement();

  const form = useForm<AgreementFormValues>({
    resolver: zodResolver(agreementFormSchema),
    defaultValues: agreement
      ? agreementToFormValues(agreement)
      : emptyAgreementDefaults(organizationId),
  });

  const onSubmit = async (values: AgreementFormValues) => {
    const payload = {
      ...values,
      organization_id: values.organization_id,
      tier_id: values.tier_id,
      msa_document_url: values.msa_document_url ? values.msa_document_url : null,
      feature_gates: values.feature_gates,
    };
    const saved = await upsert.mutateAsync(
      agreement
        ? ({ id: agreement.id, ...payload } as Parameters<typeof upsert.mutateAsync>[0])
        : (payload as Parameters<typeof upsert.mutateAsync>[0]),
    );
    onSaved?.(saved.id);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <AgreementCommercialFields form={form} />
      <Separator />
      <AgreementOverridesFields form={form} />
      <Separator />
      <AgreementFeatureGatesMatrix form={form} />
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
