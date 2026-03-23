/**
 * DomainTargetingCard — Taxonomy cascade selector for CR/CA on the Spec Review page.
 * Industry Segment is editable by CR/CA (with reference to original AM/RQ selection).
 * Proficiency Areas, Sub Domains, Specialities are optional multi-selects.
 * "Not selected" = ALL for downstream role assignments.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Globe, Layers } from 'lucide-react';
import { useIndustrySegmentOptions } from '@/hooks/queries/useTaxonomySelectors';
import { useTaxonomyCascade, type TaxonomyItem } from '@/hooks/queries/useTaxonomyCascade';

interface DomainTargetingCardProps {
  industrySegmentId: string | null;
  originalIndustrySegmentId?: string | null;
  selectedProfAreaIds: string[];
  selectedSubDomainIds: string[];
  selectedSpecialityIds: string[];
  onIndustrySegmentChange: (id: string) => void;
  onProfAreaIdsChange: (ids: string[]) => void;
  onSubDomainIdsChange: (ids: string[]) => void;
  onSpecialityIdsChange: (ids: string[]) => void;
}

function MultiSelectChecklist({
  label,
  items,
  selectedIds,
  onChange,
  emptyLabel,
}: {
  label: string;
  items: TaxonomyItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  emptyLabel: string;
}) {
  const handleToggle = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedIds, id]);
    } else {
      onChange(selectedIds.filter((i) => i !== id));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        {selectedIds.length === 0 && (
          <Badge variant="outline" className="text-[10px]">ALL</Badge>
        )}
        {selectedIds.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">{selectedIds.length} selected</Badge>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors text-sm"
            >
              <Checkbox
                checked={selectedIds.includes(item.id)}
                onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
              />
              <span className="text-foreground truncate">{item.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DomainTargetingCard({
  industrySegmentId,
  originalIndustrySegmentId,
  selectedProfAreaIds,
  selectedSubDomainIds,
  selectedSpecialityIds,
  onIndustrySegmentChange,
  onProfAreaIdsChange,
  onSubDomainIdsChange,
  onSpecialityIdsChange,
}: DomainTargetingCardProps) {
  const { data: segments = [], isLoading: loadingSegments } = useIndustrySegmentOptions();

  // Find the original segment name for reference
  const originalSegmentName = useMemo(() => {
    if (!originalIndustrySegmentId) return null;
    return segments.find((s) => s.id === originalIndustrySegmentId)?.name ?? null;
  }, [segments, originalIndustrySegmentId]);

  // Show reference label when segment has been changed from original
  const hasChanged = industrySegmentId && originalIndustrySegmentId && industrySegmentId !== originalIndustrySegmentId;

  // Cascade from industry segment
  const segmentIds = useMemo(
    () => (industrySegmentId ? [industrySegmentId] : []),
    [industrySegmentId],
  );

  const cascade = useTaxonomyCascade(segmentIds);

  // Get filtered sub-domains based on selected proficiency areas
  const filteredSubDomains = useMemo(
    () => cascade.getSubDomainsByProfAreas(selectedProfAreaIds),
    [cascade.getSubDomainsByProfAreas, selectedProfAreaIds],
  );

  // Get filtered specialities based on selected sub-domains
  const filteredSpecialities = useMemo(
    () => cascade.getSpecialitiesBySubDomains(selectedSubDomainIds),
    [cascade.getSpecialitiesBySubDomains, selectedSubDomainIds],
  );

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-3 w-full text-left rounded-xl border-2 border-border bg-card p-4 hover:bg-accent/30 transition-colors">
        <Layers className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Domain Targeting</p>
          <p className="text-xs text-muted-foreground">
            Refine the taxonomy scope for role assignments (CU, ID). Leave empty = ALL.
          </p>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-xl border-2 border-t-0 border-border bg-card px-5 pb-5 pt-3 space-y-4">
        {/* Industry Segment — editable by CR/CA */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry Segment</p>
          {loadingSegments ? (
            <Skeleton className="h-10 w-full max-w-sm" />
          ) : (
            <div className="space-y-1">
              <Select
                value={industrySegmentId ?? ''}
                onValueChange={onIndustrySegmentChange}
              >
                <SelectTrigger className="w-full max-w-sm">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <SelectValue placeholder="Select industry segment" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {segments.map((seg) => (
                    <SelectItem key={seg.id} value={seg.id}>
                      {seg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasChanged && originalSegmentName && (
                <p className="text-[11px] text-muted-foreground italic">
                  Originally from AM/RQ: {originalSegmentName}
                </p>
              )}
              {!hasChanged && originalIndustrySegmentId && (
                <p className="text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] mr-1">From AM/RQ</Badge>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Proficiency Areas */}
        {cascade.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            <MultiSelectChecklist
              label="Proficiency Areas (optional)"
              items={cascade.proficiencyAreas}
              selectedIds={selectedProfAreaIds}
              onChange={onProfAreaIdsChange}
              emptyLabel={industrySegmentId ? "No proficiency areas found for this segment" : "Select an industry segment first"}
            />
            <MultiSelectChecklist
              label="Sub Domains (optional)"
              items={filteredSubDomains}
              selectedIds={selectedSubDomainIds}
              onChange={onSubDomainIdsChange}
              emptyLabel="No sub-domains available"
            />
            <MultiSelectChecklist
              label="Specialities (optional)"
              items={filteredSpecialities}
              selectedIds={selectedSpecialityIds}
              onChange={onSpecialityIdsChange}
              emptyLabel="No specialities available"
            />
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
