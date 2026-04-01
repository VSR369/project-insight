/**
 * SectionApprovalList — List of sections with approval progress bar.
 * Shows locked sections requiring explicit approval with overall progress.
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield } from 'lucide-react';
import { SectionApprovalCard } from './SectionApprovalCard';

interface SectionDef {
  key: string;
  label: string;
  isLocked: boolean;
}

interface SectionAction {
  section_key: string;
  action_type: string;
  status: string;
}

interface SectionApprovalListProps {
  sections: SectionDef[];
  sectionActions: SectionAction[];
  approvedSections: Record<string, boolean>;
  onApproveSection: (key: string) => void;
  onUndoApproval: (key: string) => void;
}

export function SectionApprovalList({
  sections, sectionActions, approvedSections,
  onApproveSection, onUndoApproval,
}: SectionApprovalListProps) {
  const lockedSections = useMemo(
    () => sections.filter(s => s.isLocked),
    [sections]
  );

  if (lockedSections.length === 0) return null;

  const approvedCount = lockedSections.filter(s => {
    const hasDbApproval = sectionActions.some(
      a => a.section_key === s.key && a.action_type === 'approval' && a.status === 'approved'
    );
    return hasDbApproval || approvedSections[s.key];
  }).length;

  const progress = lockedSections.length > 0
    ? Math.round((approvedCount / lockedSections.length) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" />
          Section Approvals
        </CardTitle>
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">
            {approvedCount}/{lockedSections.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {lockedSections.map(s => {
          const isApproved = sectionActions.some(
            a => a.section_key === s.key && a.action_type === 'approval' && a.status === 'approved'
          ) || approvedSections[s.key];

          return (
            <SectionApprovalCard
              key={s.key}
              sectionKey={s.key}
              sectionLabel={s.label}
              isLocked={s.isLocked}
              isApproved={!!isApproved}
              onApprove={() => onApproveSection(s.key)}
              onUndo={() => onUndoApproval(s.key)}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}
