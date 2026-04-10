/**
 * WeightedCriteriaEditor — Criterion name + weight % inputs.
 * Total must equal 100%. Shows validation state inline.
 */

import { useEffect } from 'react';
import { useFieldArray, useWatch, type Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface WeightedCriteriaEditorProps {
  control: Control<Record<string, unknown>>;
  isRequired: boolean;
  error?: string;
}

export function WeightedCriteriaEditor({ control, isRequired, error }: WeightedCriteriaEditorProps) {
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'weighted_criteria' as never,
  });

  // Watch external form value to sync when form.reset() bypasses useFieldArray
  const watchedCriteria = useWatch({ control, name: 'weighted_criteria' as never }) as unknown as
    | Array<{ name: string; weight: number }>
    | undefined;

  useEffect(() => {
    if (!watchedCriteria || watchedCriteria.length === 0) return;
    if (fields.length > 0) return;
    // External value exists but useFieldArray hasn't synced — force replace
    replace(watchedCriteria as never[]);
  }, [watchedCriteria, fields.length, replace]);

  const items = fields as Array<{ id: string; name: string; weight: number }>;
  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const isValid = items.length === 0 || totalWeight === 100;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Evaluation Criteria {isRequired && <span className="text-destructive">*</span>}
      </Label>
      <p className="text-xs text-muted-foreground">
        Define how solutions will be scored. Weights must total 100%.
      </p>

      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            placeholder="Criterion name"
            className="flex-1 text-base"
            {...control.register(`weighted_criteria.${index}.name` as never)}
          />
          <div className="flex items-center gap-1 w-24">
            <Input
              type="number"
              placeholder="0"
              className="w-16 text-base text-center"
              min={0}
              max={100}
              {...control.register(`weighted_criteria.${index}.weight` as never, { valueAsNumber: true })}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => remove(index)}>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ name: '', weight: 0 })}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add Criterion
        </Button>
        {items.length > 0 && (
          <span className={`text-xs font-medium ${isValid ? 'text-emerald-600' : 'text-destructive'}`}>
            Total: {totalWeight}%{!isValid && ' (must be 100%)'}
          </span>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
