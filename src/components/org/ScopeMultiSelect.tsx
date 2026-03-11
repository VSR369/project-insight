/**
 * ScopeMultiSelect — Cascading multi-select for domain scope.
 * Industry Segments (required) → Proficiency Areas → Sub-domains → Specialities
 * Departments → Functional Areas (hidden when hideDepartments=true)
 */

import { useIndustrySegments } from '@/hooks/queries/useMasterData';
import { useDepartments } from '@/hooks/queries/usePrimaryContactData';
import { useFunctionalAreas } from '@/hooks/queries/useFunctionalAreas';
import { useProficiencyAreasBySegments, useSubDomainsByAreas, useSpecialitiesBySubDomains } from '@/hooks/queries/useScopeTaxonomy';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DomainScope } from '@/hooks/queries/useDelegatedAdmins';

interface ScopeMultiSelectProps {
  value: DomainScope;
  onChange: (scope: DomainScope) => void;
  /** Hide Department and Functional Area fields (e.g., for Pool Members) */
  hideDepartments?: boolean;
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

export function ScopeMultiSelect({ value, onChange, hideDepartments = false }: ScopeMultiSelectProps) {
  const { data: industries = [] } = useIndustrySegments();
  const { data: departments = [] } = useDepartments();
  const { data: functionalAreas = [] } = useFunctionalAreas();

  // Cascading taxonomy hooks
  const { data: proficiencyAreas = [] } = useProficiencyAreasBySegments(value.industry_segment_ids);
  const { data: subDomains = [] } = useSubDomainsByAreas(value.proficiency_area_ids);
  const { data: specialities = [] } = useSpecialitiesBySubDomains(value.sub_domain_ids);

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
      {/* Industry Segments (required) */}
      <MultiSelectField
        label="Industry Segments"
        required
        items={industries.map((i) => ({ id: i.id, name: i.name }))}
        selectedIds={value.industry_segment_ids}
        onAdd={addTo('industry_segment_ids')}
        onRemove={(id) => {
          // Cascade: remove proficiency areas from this segment
          const paIdsToRemove = proficiencyAreas
            .filter((pa) => pa.industry_segment_id === id)
            .map((pa) => pa.id);
          const sdIdsToRemove = subDomains
            .filter((sd) => paIdsToRemove.includes(sd.proficiency_area_id))
            .map((sd) => sd.id);
          const spIdsToRemove = specialities
            .filter((sp) => sdIdsToRemove.includes(sp.sub_domain_id))
            .map((sp) => sp.id);
          onChange({
            ...value,
            industry_segment_ids: value.industry_segment_ids.filter((v) => v !== id),
            proficiency_area_ids: value.proficiency_area_ids.filter((v) => !paIdsToRemove.includes(v)),
            sub_domain_ids: value.sub_domain_ids.filter((v) => !sdIdsToRemove.includes(v)),
            speciality_ids: value.speciality_ids.filter((v) => !spIdsToRemove.includes(v)),
          });
        }}
        placeholder="Select industry segments..."
      />

      {/* Proficiency Areas (filtered by industry segments) */}
      {value.industry_segment_ids.length > 0 && (
        <MultiSelectField
          label="Proficiency Areas"
          items={proficiencyAreas.map((pa) => ({ id: pa.id, name: pa.name }))}
          selectedIds={value.proficiency_area_ids}
          onAdd={addTo('proficiency_area_ids')}
          onRemove={(id) => {
            // Cascade: remove sub-domains from this area
            const sdIdsToRemove = subDomains
              .filter((sd) => sd.proficiency_area_id === id)
              .map((sd) => sd.id);
            const spIdsToRemove = specialities
              .filter((sp) => sdIdsToRemove.includes(sp.sub_domain_id))
              .map((sp) => sp.id);
            onChange({
              ...value,
              proficiency_area_ids: value.proficiency_area_ids.filter((v) => v !== id),
              sub_domain_ids: value.sub_domain_ids.filter((v) => !sdIdsToRemove.includes(v)),
              speciality_ids: value.speciality_ids.filter((v) => !spIdsToRemove.includes(v)),
            });
          }}
          placeholder="Select proficiency areas..."
          helpText="Optional — empty means ALL proficiency areas within selected industries"
        />
      )}

      {/* Sub-domains (filtered by proficiency areas) */}
      {value.proficiency_area_ids.length > 0 && (
        <MultiSelectField
          label="Sub-domains"
          items={subDomains.map((sd) => ({ id: sd.id, name: sd.name }))}
          selectedIds={value.sub_domain_ids}
          onAdd={addTo('sub_domain_ids')}
          onRemove={(id) => {
            // Cascade: remove specialities from this sub-domain
            const spIdsToRemove = specialities
              .filter((sp) => sp.sub_domain_id === id)
              .map((sp) => sp.id);
            onChange({
              ...value,
              sub_domain_ids: value.sub_domain_ids.filter((v) => v !== id),
              speciality_ids: value.speciality_ids.filter((v) => !spIdsToRemove.includes(v)),
            });
          }}
          placeholder="Select sub-domains..."
          helpText="Optional — empty means ALL sub-domains within selected proficiency areas"
        />
      )}

      {/* Specialities (filtered by sub-domains) */}
      {value.sub_domain_ids.length > 0 && (
        <MultiSelectField
          label="Specialities"
          items={specialities.map((sp) => ({ id: sp.id, name: sp.name }))}
          selectedIds={value.speciality_ids}
          onAdd={addTo('speciality_ids')}
          onRemove={removeFrom('speciality_ids')}
          placeholder="Select specialities..."
          helpText="Optional — empty means ALL specialities within selected sub-domains"
        />
      )}

      {/* Departments — only shown when hideDepartments is false */}
      {!hideDepartments && (
        <>
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

          {/* Functional Areas (filtered by departments) */}
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
        </>
      )}

      <p className="text-xs text-muted-foreground border-t pt-3">
        Industry Segments are required. All other scope fields are optional — empty means ALL access for that dimension.
      </p>
    </div>
  );
}
