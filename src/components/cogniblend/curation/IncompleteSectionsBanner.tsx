/**
 * IncompleteSectionsBanner — Sticky banner above the main grid showing
 * all incomplete/missing sections. Uses shared incompleteSectionsUtil.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildIncompleteGroups, countTotalMissing } from '@/lib/cogniblend/incompleteSectionsUtil';
import type {
  GroupDef,
  SectionDef,
  ChallengeData,
  LegalDocSummary,
  LegalDocDetail,
  EscrowRecord,
} from '@/lib/cogniblend/curationTypes';

interface IncompleteSectionsBannerProps {
  groups: GroupDef[];
  sectionMap: Map<string, SectionDef>;
  groupProgress: Record<string, { done: number; total: number }>;
  onNavigateToSection: (sectionKey: string) => void;
  challenge?: ChallengeData | null;
  legalDocs?: LegalDocSummary[];
  legalDetails?: LegalDocDetail[];
  escrowRecord?: EscrowRecord | null;
}

export function IncompleteSectionsBanner({
  groups,
  sectionMap,
  groupProgress,
  onNavigateToSection,
  challenge,
  legalDocs,
  legalDetails,
  escrowRecord,
}: IncompleteSectionsBannerProps) {
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const prevMissingRef = useRef(0);

  const incompleteGroups = useMemo(
    () => buildIncompleteGroups(groups, sectionMap, groupProgress, challenge, legalDocs, legalDetails, escrowRecord),
    [groups, sectionMap, groupProgress, challenge, legalDocs, legalDetails, escrowRecord],
  );

  const totalMissing = countTotalMissing(incompleteGroups);

  // Re-show banner if new sections become incomplete after dismissal
  useEffect(() => {
    if (dismissedAt !== null && totalMissing > prevMissingRef.current) {
      setDismissedAt(null);
    }
    prevMissingRef.current = totalMissing;
  }, [totalMissing, dismissedAt]);

  if (dismissedAt !== null || totalMissing === 0) return null;

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
            onClick={() => setDismissedAt(Date.now())}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          {incompleteGroups.map((g) => (
            <div key={g.groupId}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 px-1 mb-1">
                {g.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {g.incompleteSectionKeys.map((key) => {
                  const sec = sectionMap.get(key);
                  if (!sec) return null;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onNavigateToSection(key)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
                        bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300
                        hover:bg-amber-200 dark:hover:bg-amber-800/50 cursor-pointer transition-colors"
                    >
                      {sec.label ?? key}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
