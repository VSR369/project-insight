/**
 * ApprovalProgressBar — Bottom bar showing overall approval progress.
 */

import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCheck, Send } from 'lucide-react';

interface ApprovalProgressBarProps {
  totalApproved: number;
  totalSections: number;
  onApproveAll: () => void;
  onSubmitFeedback: () => void;
  isControlled: boolean;
  isSubmitting?: boolean;
}

export function ApprovalProgressBar({
  totalApproved, totalSections,
  onApproveAll, onSubmitFeedback, isControlled, isSubmitting,
}: ApprovalProgressBarProps) {
  const pct = totalSections > 0 ? Math.round((totalApproved / totalSections) * 100) : 0;
  const allDone = totalApproved === totalSections && totalSections > 0;

  return (
    <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t p-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Progress value={pct} className="h-2.5 flex-1" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {totalApproved}/{totalSections} approved
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isControlled && !allDone && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onApproveAll}>
              <CheckCheck className="h-3.5 w-3.5" />
              Approve All Remaining
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onSubmitFeedback}
            disabled={isSubmitting}
          >
            <Send className="h-3.5 w-3.5" />
            {allDone ? 'Approve & Publish' : 'Submit Feedback'}
          </Button>
        </div>
      </div>
    </div>
  );
}
