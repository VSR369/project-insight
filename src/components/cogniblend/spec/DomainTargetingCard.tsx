/**
 * DomainTargetingCard — Taxonomy cascade selector for CR/CA on the Spec Review page.
 * Industry Segment is read-only (passed from AM/RQ).
 * Proficiency Areas, Sub Domains, Specialities are optional multi-selects.
 * "Not selected" = ALL for downstream role assignments.
 */

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
  selectedProfAreaIds: string[];
  selectedSubDomainIds: string[];
  selectedSpecialityIds: string[];
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
  selectedProfAreaIds,
  selectedSubDomainIds,
  selectedSpecialityIds,
  onProfAreaIdsChange,
  onSubDomainIdsChange,
  onSpecialityIdsChange,
}: DomainTargetingCardProps) {
  const { data: segments = [], isLoading: loadingSegments } = useIndustrySegmentOptions();

  // Find the segment name
  const segmentName = useMemo(() => {
    if (!industrySegmentId) return null;
    return segments.find((s) => s.id === industrySegmentId)?.name ?? null;
  }, [segments, industrySegmentId]);

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

  if (!industrySegmentId) return null;

  return (
    <Collapsible defaultOpen>
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
        {/* Industry Segment — read-only */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Industry Segment</p>
          {loadingSegments ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{segmentName ?? 'Unknown'}</span>
              <Badge variant="outline" className="text-[10px]">From AM/RQ</Badge>
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
              emptyLabel="No proficiency areas found for this segment"
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
