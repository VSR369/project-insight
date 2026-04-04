/**
 * StakeholderEditor — Structured stakeholder table for Additional Context tab.
 * Each row: name, role, impact, adoption challenge.
 */

import { Controller, useFormContext, useFieldArray } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { CreatorFormValues } from './creatorFormSchema';

const EMPTY_STAKEHOLDER = {
  stakeholder_name: '',
  role: '',
  impact_description: '',
  adoption_challenge: '',
};

interface StakeholderEditorProps {
  isControlled: boolean;
}

export function StakeholderEditor({ isControlled }: StakeholderEditorProps) {
  const { control, formState: { errors } } = useFormContext<CreatorFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'affected_stakeholders',
  });

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Affected Stakeholders
        {isControlled && <span className="text-destructive ml-1">*</span>}
      </Label>
      <p className="text-xs text-muted-foreground">
        Who uses or is affected by this solution? Add each stakeholder with their role and impact.
      </p>

      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((sh, index) => (
            <div key={sh.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">Stakeholder {index + 1}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                <Controller name={`affected_stakeholders.${index}.stakeholder_name`} control={control} render={({ field }) => (
                  <Input placeholder="Name / Group" className="text-base" {...field} />
                )} />
                <Controller name={`affected_stakeholders.${index}.role`} control={control} render={({ field }) => (
                  <Input placeholder="Role" className="text-base" {...field} />
                )} />
                <Controller name={`affected_stakeholders.${index}.impact_description`} control={control} render={({ field }) => (
                  <Input placeholder="Impact description" className="text-base" {...field} />
                )} />
                <Controller name={`affected_stakeholders.${index}.adoption_challenge`} control={control} render={({ field }) => (
                  <Input placeholder="Adoption challenge" className="text-base" {...field} />
                )} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => append(EMPTY_STAKEHOLDER)}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Stakeholder
      </Button>
      {errors.affected_stakeholders?.message && (
        <p className="text-xs text-destructive">{String(errors.affected_stakeholders.message)}</p>
      )}
    </div>
  );
}
