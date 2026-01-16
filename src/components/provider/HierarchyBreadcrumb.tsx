import { ChevronRight } from 'lucide-react';
import { useProviderHierarchy, type HierarchyLevel } from '@/hooks/queries/useProviderHierarchy';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface HierarchyBreadcrumbProps {
  className?: string;
}

function BreadcrumbItem({ 
  label, 
  items, 
  pending = false,
  pendingLabel = 'pending...'
}: { 
  label: string;
  items: HierarchyLevel[];
  pending?: boolean;
  pendingLabel?: string;
}) {
  if (pending || items.length === 0) {
    return (
      <span className="text-muted-foreground/60 italic text-xs">
        {pendingLabel}
      </span>
    );
  }

  if (items.length === 1) {
    return (
      <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5">
        {items[0].name}
      </Badge>
    );
  }

  // Multiple items - show count with first item
  return (
    <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5">
      {items[0].name} +{items.length - 1}
    </Badge>
  );
}

function SingleItem({ 
  item, 
  pendingLabel = 'pending...'
}: { 
  item: HierarchyLevel | null;
  pendingLabel?: string;
}) {
  if (!item) {
    return (
      <span className="text-muted-foreground/60 italic text-xs">
        {pendingLabel}
      </span>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs font-normal px-2 py-0.5">
      {item.name}
    </Badge>
  );
}

function Separator() {
  return (
    <ChevronRight className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
  );
}

export function HierarchyBreadcrumb({ className }: HierarchyBreadcrumbProps) {
  const hierarchy = useProviderHierarchy();

  if (hierarchy.isLoading) {
    return (
      <div className={cn("border-b px-4 py-2 bg-muted/30", className)}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    );
  }

  // Don't show if no industry segment selected yet (very early in flow)
  const hasAnySelection = hierarchy.industrySegment || hierarchy.expertiseLevel;
  if (!hasAnySelection) {
    return null;
  }

  return (
    <div className={cn("border-b px-4 py-2 bg-muted/30", className)}>
      <div className="flex items-center gap-2 overflow-x-auto text-sm">
        {/* Industry Segment */}
        <SingleItem 
          item={hierarchy.industrySegment} 
          pendingLabel="Select Industry" 
        />

        <Separator />

        {/* Expertise Level */}
        <SingleItem 
          item={hierarchy.expertiseLevel} 
          pendingLabel="Select Expertise" 
        />

        {/* Proficiency Areas - only show if expertise is selected */}
        {hierarchy.expertiseLevel && (
          <>
            <Separator />
            <BreadcrumbItem 
              label="Areas"
              items={hierarchy.proficiencyAreas}
              pending={false}
              pendingLabel="Select Areas"
            />
          </>
        )}

        {/* Sub-Domains - only show if areas are selected */}
        {hierarchy.proficiencyAreas.length > 0 && (
          <>
            <Separator />
            <BreadcrumbItem 
              label="Sub-Domains"
              items={hierarchy.subDomains}
              pending={false}
              pendingLabel="Select Sub-Domains"
            />
          </>
        )}

        {/* Specialities - only show if sub-domains are selected */}
        {hierarchy.subDomains.length > 0 && (
          <>
            <Separator />
            <BreadcrumbItem 
              label="Specialities"
              items={hierarchy.specialities}
              pending={false}
              pendingLabel="Select Specialities"
            />
          </>
        )}
      </div>
    </div>
  );
}
