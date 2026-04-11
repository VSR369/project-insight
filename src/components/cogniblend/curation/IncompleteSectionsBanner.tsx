/**
 * IncompleteSectionsBanner — Sticky banner above the main grid showing
 * all incomplete/missing sections. Uses shared incompleteSectionsUtil.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildIncompleteGroups, countTotalMissing } from '@/lib/cogniblend/incompleteSectionsUtil';
import type { GroupDef, SectionDef } from '@/lib/cogniblend/curationTypes';

interface IncompleteSectionsBannerProps {
  groups: GroupDef[];
  sectionMap: Map<string, SectionDef>;
  groupProgress: Record<string, { done: number; total: number }>;
  onNavigateToSection: (sectionKey: string) => void;
}

export function IncompleteSectionsBanner({
  groups,
  sectionMap,
  groupProgress,
  onNavigateToSection,
}: IncompleteSectionsBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const incompleteGroups = useMemo(
    () => buildIncompleteGroups(groups, sectionMap, groupProgress),
    [groups, sectionMap, groupProgress],
  );

  const totalMissing = countTotalMissing(incompleteGroups);

  if (dismissed || totalMissing === 0) return null;

  return (
    <div className="sticky top-0 z-30 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-4 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-[13px] font-medium text-amber-800 dark:text-amber-300">
            {totalMissing} section{totalMissing !== 1 ? 's' : ''} incomplete across{' '}
            {incompleteGroups.length} group{incompleteGroups.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Collapse' : 'Details'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {incompleteGroups.map((g) => (
            <button
              key={g.groupId}
              type="button"
              onClick={() => {
                const firstKey = g.sectionKeys[0];
                if (firstKey) onNavigateToSection(firstKey);
              }}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium',
                'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300',
                'hover:bg-amber-200 dark:hover:bg-amber-800/50 cursor-pointer transition-colors',
              )}
            >
              {g.label}
              <span className="text-amber-600 dark:text-amber-400">
                ({g.missing}/{g.total})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
