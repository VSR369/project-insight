/**
 * ScopeMultiSelect — Cascading multi-select for domain scope.
 * Industry Segments (required) → Proficiency Areas → Sub-domains → Specialities
 * Departments → Functional Areas (hidden when hideDepartments=true)
 *
 * When allowAll=true, each level gets an "All" toggle switch.
 * "All" = empty array = covers everything at that level.
 */

import { useIndustrySegments } from '@/hooks/queries/useMasterData';
import { useDepartments } from '@/hooks/queries/usePrimaryContactData';
import { useFunctionalAreas } from '@/hooks/queries/useFunctionalAreas';
import { useProficiencyAreasBySegments, useSubDomainsByAreas, useSpecialitiesBySubDomains, useAllProficiencyAreas } from '@/hooks/queries/useScopeTaxonomy';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import type { DomainScope } from '@/hooks/queries/useDelegatedAdmins';

interface ScopeMultiSelectProps {
  value: DomainScope;
  onChange: (scope: DomainScope) => void;
  /** Hide Department and Functional Area fields (e.g., for Pool Members) */
  hideDepartments?: boolean;
  /** Show "All" toggle switches at each scope level (e.g., for Pool Members) */
  allowAll?: boolean;
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

export function ScopeMultiSelect({ value, onChange, hideDepartments = false, allowAll = false }: ScopeMultiSelectProps) {
  const { data: industries = [] } = useIndustrySegments();
  const { data: departments = [] } = useDepartments();
  const { data: functionalAreas = [] } = useFunctionalAreas();

  // Local state booleans for "All" toggles — decoupled from array contents
  const [isAllIndustries, setIsAllIndustries] = useState(allowAll && value.industry_segment_ids.length === 0);
  const [isAllProficiency, setIsAllProficiency] = useState(allowAll && value.proficiency_area_ids.length === 0);
  const [isAllSubDomains, setIsAllSubDomains] = useState(allowAll && value.sub_domain_ids.length === 0);
  const [isAllSpecialities, setIsAllSpecialities] = useState(allowAll && value.speciality_ids.length === 0);

  // Sync local toggle state when value prop changes externally (e.g., form reset)
  useEffect(() => {
    if (allowAll) {
      setIsAllIndustries(value.industry_segment_ids.length === 0);
      setIsAllProficiency(value.proficiency_area_ids.length === 0);
      setIsAllSubDomains(value.sub_domain_ids.length === 0);
      setIsAllSpecialities(value.speciality_ids.length === 0);
    }
  }, [allowAll, value]);

  // Cascading taxonomy hooks
  const { data: proficiencyAreasBySegment = [] } = useProficiencyAreasBySegments(value.industry_segment_ids);
  const { data: allProficiencyAreas = [] } = useAllProficiencyAreas(isAllIndustries);
  const { data: subDomains = [] } = useSubDomainsByAreas(value.proficiency_area_ids);
  const { data: specialities = [] } = useSpecialitiesBySubDomains(value.sub_domain_ids);

  // Use segment-scoped or global proficiency areas depending on ALL Industries toggle
  const proficiencyAreas = isAllIndustries ? allProficiencyAreas : proficiencyAreasBySegment;

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

  // Toggle handlers for "All" switches
  const toggleAllIndustries = (checked: boolean) => {
    setIsAllIndustries(checked);
    if (checked) {
      onChange({
        ...value,
        industry_segment_ids: [],
        proficiency_area_ids: [],
        sub_domain_ids: [],
        speciality_ids: [],
      });
      setIsAllProficiency(true);
      setIsAllSubDomains(true);
      setIsAllSpecialities(true);
    }
  };

  const toggleAllProficiency = (checked: boolean) => {
    setIsAllProficiency(checked);
    if (checked) {
      onChange({
        ...value,
        proficiency_area_ids: [],
        sub_domain_ids: [],
        speciality_ids: [],
      });
      setIsAllSubDomains(true);
      setIsAllSpecialities(true);
    }
  };

  const toggleAllSubDomains = (checked: boolean) => {
    setIsAllSubDomains(checked);
    if (checked) {
      onChange({
        ...value,
        sub_domain_ids: [],
        speciality_ids: [],
      });
      setIsAllSpecialities(true);
    }
  };

  const toggleAllSpecialities = (checked: boolean) => {
    setIsAllSpecialities(checked);
    if (checked) {
      onChange({
        ...value,
        speciality_ids: [],
      });
    }
  };

  // Determine visibility of cascading sections
  const showProficiency = isAllIndustries || value.industry_segment_ids.length > 0;
  const showSubDomains = !isAllProficiency && value.proficiency_area_ids.length > 0;
  const showSpecialities = !isAllSubDomains && value.sub_domain_ids.length > 0;

  return (
    <div className="space-y-4">
      {/* Industry Segments */}
      <div className="space-y-2">
        {allowAll && (
          <div className="flex items-center gap-2">
            <Switch
              id="all-industries"
              checked={isAllIndustries}
              onCheckedChange={toggleAllIndustries}
            />
            <Label htmlFor="all-industries" className="text-sm font-medium cursor-pointer">
              All Industries
            </Label>
          </div>
        )}
        {!isAllIndustries && (
          <MultiSelectField
            label="Industry Segments"
            required={!allowAll}
            items={industries.map((i) => ({ id: i.id, name: i.name }))}
            selectedIds={value.industry_segment_ids}
            onAdd={addTo('industry_segment_ids')}
            onRemove={(id) => {
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
        )}
      </div>

      {/* Proficiency Areas */}
      {showProficiency && (
        <div className="space-y-2">
          {allowAll && (
            <div className="flex items-center gap-2">
              <Switch
                id="all-proficiency"
                checked={isAllProficiency}
                onCheckedChange={toggleAllProficiency}
              />
              <Label htmlFor="all-proficiency" className="text-sm font-medium cursor-pointer">
                All Proficiency Areas
              </Label>
            </div>
          )}
          {!isAllProficiency && (
            <MultiSelectField
              label="Proficiency Areas"
              items={proficiencyAreas.map((pa) => ({ id: pa.id, name: pa.name }))}
              selectedIds={value.proficiency_area_ids}
              onAdd={addTo('proficiency_area_ids')}
              onRemove={(id) => {
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
              helpText={allowAll ? undefined : "Optional — empty means ALL proficiency areas within selected industries"}
            />
          )}
        </div>
      )}

      {/* Sub-domains */}
      {showSubDomains && (
        <div className="space-y-2">
          {allowAll && (
            <div className="flex items-center gap-2">
              <Switch
                id="all-sub-domains"
                checked={isAllSubDomains}
                onCheckedChange={toggleAllSubDomains}
              />
              <Label htmlFor="all-sub-domains" className="text-sm font-medium cursor-pointer">
                All Sub-domains
              </Label>
            </div>
          )}
          {!isAllSubDomains && (
            <MultiSelectField
              label="Sub-domains"
              items={subDomains.map((sd) => ({ id: sd.id, name: sd.name }))}
              selectedIds={value.sub_domain_ids}
              onAdd={addTo('sub_domain_ids')}
              onRemove={(id) => {
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
              helpText={allowAll ? undefined : "Optional — empty means ALL sub-domains within selected proficiency areas"}
            />
          )}
        </div>
      )}

      {/* Specialities */}
      {showSpecialities && (
        <div className="space-y-2">
          {allowAll && (
            <div className="flex items-center gap-2">
              <Switch
                id="all-specialities"
                checked={isAllSpecialities}
                onCheckedChange={toggleAllSpecialities}
              />
              <Label htmlFor="all-specialities" className="text-sm font-medium cursor-pointer">
                All Specialities
              </Label>
            </div>
          )}
          {!allSpecialities && (
            <MultiSelectField
              label="Specialities"
              items={specialities.map((sp) => ({ id: sp.id, name: sp.name }))}
              selectedIds={value.speciality_ids}
              onAdd={addTo('speciality_ids')}
              onRemove={removeFrom('speciality_ids')}
              placeholder="Select specialities..."
              helpText={allowAll ? undefined : "Optional — empty means ALL specialities within selected sub-domains"}
            />
          )}
        </div>
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
        </>
      )}

      <p className="text-xs text-muted-foreground border-t pt-3">
        {allowAll
          ? "Toggle \"All\" to cover every option at that level, or select specific items. Empty = ALL access for that dimension."
          : "Industry Segments are required. All other scope fields are optional — empty means ALL access for that dimension."}
      </p>
    </div>
  );
}
