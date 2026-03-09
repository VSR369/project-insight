/**
 * ScopeMultiSelect — Cascading multi-select for domain scope.
 * Industry Segments (required) → Proficiency Areas → Sub-domains → Specialities
 * Departments → Functional Areas
 */

import { useIndustrySegments } from '@/hooks/queries/useMasterData';
import { useDepartments } from '@/hooks/queries/usePrimaryContactData';
import { useFunctionalAreas } from '@/hooks/queries/useFunctionalAreas';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DomainScope } from '@/hooks/queries/useDelegatedAdmins';

interface ScopeMultiSelectProps {
  value: DomainScope;
  onChange: (scope: DomainScope) => void;
}

function MultiSelectField({
  label,
  required,
  items,
  selectedIds,
  onAdd,
  onRemove,
  placeholder,
  helpText,
}: {
  label: string;
  required?: boolean;
  items: { id: string; name: string }[];
  selectedIds: string[];
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  placeholder: string;
  helpText?: string;
}) {
  const availableItems = items.filter((i) => !selectedIds.includes(i.id));
  const selectedItems = items.filter((i) => selectedIds.includes(i.id));

  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {availableItems.length > 0 && (
        <Select onValueChange={onAdd}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {availableItems.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1">
              {item.name}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onRemove(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

export function ScopeMultiSelect({ value, onChange }: ScopeMultiSelectProps) {
  const { data: industries = [] } = useIndustrySegments();
  const { data: departments = [] } = useDepartments();
  const { data: functionalAreas = [] } = useFunctionalAreas();

  // Filter functional areas by selected departments
  const filteredFAs = value.department_ids.length > 0
    ? functionalAreas.filter((fa) => value.department_ids.includes(fa.department_id))
    : functionalAreas;

  const updateField = (field: keyof DomainScope, ids: string[]) => {
    onChange({ ...value, [field]: ids });
  };

  const addTo = (field: keyof DomainScope) => (id: string) => {
    updateField(field, [...value[field], id]);
  };

  const removeFrom = (field: keyof DomainScope) => (id: string) => {
    updateField(field, value[field].filter((v) => v !== id));
  };

  return (
    <div className="space-y-4">
      <MultiSelectField
        label="Industry Segments"
        required
        items={industries.map((i) => ({ id: i.id, name: i.name }))}
        selectedIds={value.industry_segment_ids}
        onAdd={addTo('industry_segment_ids')}
        onRemove={removeFrom('industry_segment_ids')}
        placeholder="Select industry segments..."
      />

      <MultiSelectField
        label="Departments"
        items={departments.map((d) => ({ id: d.id, name: d.name }))}
        selectedIds={value.department_ids}
        onAdd={addTo('department_ids')}
        onRemove={(id) => {
          // Also remove functional areas from this department
          const faIdsToRemove = functionalAreas
            .filter((fa) => fa.department_id === id)
            .map((fa) => fa.id);
          onChange({
            ...value,
            department_ids: value.department_ids.filter((v) => v !== id),
            functional_area_ids: value.functional_area_ids.filter((v) => !faIdsToRemove.includes(v)),
          });
        }}
        placeholder="Select departments..."
        helpText="Optional — empty means ALL departments"
      />

      {value.department_ids.length > 0 && (
        <MultiSelectField
          label="Functional Areas"
          items={filteredFAs.map((fa) => ({ id: fa.id, name: fa.name }))}
          selectedIds={value.functional_area_ids}
          onAdd={addTo('functional_area_ids')}
          onRemove={removeFrom('functional_area_ids')}
          placeholder="Select functional areas..."
          helpText="Optional — empty means ALL functional areas within selected departments"
        />
      )}

      <p className="text-xs text-muted-foreground border-t pt-3">
        Industry Segments are required. All other scope fields are optional — empty means ALL access for that dimension.
      </p>
    </div>
  );
}
