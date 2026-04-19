/**
 * CreatorApprovalStatusBanner — Full-width banner reflecting Creator approval state.
 *
 * Shown on the Creator Review page and any other surface where the Creator's
 * decision matters. Pure presentational — receives status + dates as props.
 */
import { CheckCircle2, Clock, MessageSquareWarning, XOctagon, Send } from 'lucide-react';
import { format } from 'date-fns';

type ApprovalStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'changes_submitted'
  | 'changes_requested'
  | 'timeout_override';

export interface CreatorApprovalStatusBannerProps {
  status: ApprovalStatus | string | null;
  approvedAt?: string | null;
  notes?: string | null;
}

export function CreatorApprovalStatusBanner({
  status,
  approvedAt,
  notes,
}: CreatorApprovalStatusBannerProps) {
  if (!status || status === 'not_required') return null;

  const formattedApproval = approvedAt
    ? format(new Date(approvedAt), 'MMM d, yyyy · h:mm a')
    : null;

  const config: Record<
    string,
    { icon: React.ElementType; className: string; message: string }
  > = {
    pending: {
      icon: Clock,
      className: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200',
      message: 'Awaiting your review. Please review all sections and approve or request changes.',
    },
    approved: {
      icon: CheckCircle2,
      className: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200',
      message: formattedApproval
        ? `You approved this challenge on ${formattedApproval}.`
        : 'You approved this challenge.',
    },
    changes_submitted: {
      icon: Send,
      className: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
      message: 'Your edits have been submitted. The Curator is reviewing.',
    },
    changes_requested: {
      icon: MessageSquareWarning,
      className: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
      message: notes
        ? `You requested re-curation. Reason: ${notes}`
        : 'You requested re-curation.',
    },
    timeout_override: {
      icon: XOctagon,
      className: 'border-muted bg-muted/50 text-muted-foreground',
      message: 'Approval window expired. Curator has overridden.',
    },
  };

  const entry = config[status];
  if (!entry) return null;

  const Icon = entry.icon;
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${entry.className}`}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <p className="text-sm leading-relaxed">{entry.message}</p>
    </div>
  );
}

export default CreatorApprovalStatusBanner;
