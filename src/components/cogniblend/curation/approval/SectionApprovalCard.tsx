/**
 * SectionApprovalCard — Single section approval status card.
 * Displays section label, lock status, and approve/undo actions.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, Undo2 } from 'lucide-react';

interface SectionApprovalCardProps {
  sectionKey: string;
  sectionLabel: string;
  isLocked: boolean;
  isApproved: boolean;
  onApprove?: () => void;
  onUndo?: () => void;
}

export function SectionApprovalCard({
  sectionKey,
  sectionLabel,
  isLocked,
  isApproved,
  onApprove,
  onUndo,
}: SectionApprovalCardProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md border text-sm">
      <div className="flex items-center gap-2 min-w-0">
        {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span className="truncate">{sectionLabel}</span>
        {isApproved && (
          <Badge variant="outline" className="text-xs gap-1 text-emerald-600 shrink-0">
            <CheckCircle className="h-3 w-3" />Approved
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isLocked && !isApproved && onApprove && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onApprove}>
            Approve
          </Button>
        )}
        {isLocked && isApproved && onUndo && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onUndo}>
            <Undo2 className="h-3 w-3 mr-1" />Undo
          </Button>
        )}
      </div>
    </div>
  );
}
