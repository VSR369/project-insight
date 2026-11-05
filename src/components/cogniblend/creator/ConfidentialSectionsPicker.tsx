/**
 * ConfidentialSectionsPicker — BR-CHL-P09: creator marks which extended-brief
 * sections stay hidden from Solution Providers until they accept the
 * challenge's confidentiality agreement.
 */

import { Controller, useFormContext } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import type { CreatorFormValues } from './creatorFormSchema';
import {
  CONFIDENTIAL_ELIGIBLE_KEYS,
  toggleConfidentialKey,
} from '@/services/cogniblend/lifecycle/confidentialSections';
import { isFieldVisible, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

interface ConfidentialSectionsPickerProps {
  fieldRules?: FieldRulesMap;
}

export function ConfidentialSectionsPicker({ fieldRules }: ConfidentialSectionsPickerProps) {
  const { control } = useFormContext<CreatorFormValues>();
  const rules = fieldRules ?? {};
  const visibleFields = CONFIDENTIAL_ELIGIBLE_KEYS.filter((f) => isFieldVisible(rules, f.key));

  if (visibleFields.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-start gap-2.5">
        <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Confidential sections</p>
          <p className="text-xs text-muted-foreground">
            Tick sections that contain sensitive detail. Providers only see them after accepting the
            confidentiality agreement for this challenge.
          </p>
        </div>
      </div>
      <Controller
        name="confidential_brief_keys"
        control={control}
        render={({ field }) => (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {visibleFields.map((f) => {
              const checked = field.value?.includes(f.key) ?? false;
              return (
                <div key={f.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`confidential-${f.key}`}
                    checked={checked}
                    onCheckedChange={() => field.onChange(toggleConfidentialKey(field.value ?? [], f.key))}
                  />
                  <Label htmlFor={`confidential-${f.key}`} className="text-xs font-normal cursor-pointer">
                    {f.label}
                  </Label>
                </div>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}
