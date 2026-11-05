/** SolverAudienceSelector — ALL / INTERNAL / EXTERNAL audience radio for the creator form. */
import { useFormContext } from 'react-hook-form';
import { Users } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { CreatorFormValues } from './creatorFormSchema';

const AUDIENCE_OPTIONS: ReadonlyArray<{ value: 'ALL' | 'INTERNAL' | 'EXTERNAL'; id: string; label: string }> = [
  { value: 'ALL', id: 'sa-all', label: 'All Solution Providers' },
  { value: 'INTERNAL', id: 'sa-internal', label: 'Internal Pool Only' },
  { value: 'EXTERNAL', id: 'sa-external', label: 'External Marketplace Only' },
];

export function SolverAudienceSelector() {
  const form = useFormContext<CreatorFormValues>();
  return (
    <div className="rounded-lg border border-border p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4 text-muted-foreground" />
        Solution Provider Audience
      </div>
      <RadioGroup
        value={form.watch('solver_audience')}
        onValueChange={(v) => form.setValue('solver_audience', v as 'ALL' | 'INTERNAL' | 'EXTERNAL', { shouldDirty: true })}
        className="flex flex-col gap-1.5"
      >
        {AUDIENCE_OPTIONS.map((o) => (
          <div key={o.value} className="flex items-center gap-2">
            <RadioGroupItem value={o.value} id={o.id} />
            <Label htmlFor={o.id} className="text-sm font-normal cursor-pointer">{o.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
