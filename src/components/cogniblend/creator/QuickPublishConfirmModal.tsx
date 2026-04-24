/**
 * QuickPublishConfirmModal — Pre-publish routing summary for QUICK mode.
 *
 * Shown only when governance_mode === 'QUICK'. Lists where the challenge
 * will be sent, who will see it, and the notification cadence — using
 * centralized constants (no copy literals).
 */

import { Megaphone, Users, Eye, Clock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  SOLVER_AUDIENCE_LABELS,
  VISIBILITY_LABELS,
  ENGAGEMENT_LABELS,
  NOTIFICATION_CADENCE_COPY,
  type SolverAudience,
  type EngagementCode,
} from '@/constants/solverRouting.constants';

interface QuickPublishConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  challengeTitle: string;
  engagementModel: string;
  solverAudience: SolverAudience;
  visibility?: string | null;
  isSubmitting?: boolean;
}

function normalizeEngagement(model: string): EngagementCode {
  const upper = (model ?? '').toUpperCase();
  return upper === 'AGG' || upper === 'AGGREGATOR' ? 'AGG' : 'MP';
}

function normalizeVisibility(value: string | null | undefined): string {
  return (value ?? 'PUBLIC').toUpperCase();
}

interface RowProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function Row({ icon: Icon, label, value }: RowProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3">
      <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

export function QuickPublishConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  challengeTitle,
  engagementModel,
  solverAudience,
  visibility,
  isSubmitting = false,
}: QuickPublishConfirmModalProps) {
  const engagement = normalizeEngagement(engagementModel);
  const visibilityKey = normalizeVisibility(visibility);
  const audienceLabel = SOLVER_AUDIENCE_LABELS[engagement][solverAudience];
  const visibilityLabel = VISIBILITY_LABELS[visibilityKey] ?? VISIBILITY_LABELS.PUBLIC;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Publish &amp; notify Solution Providers
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review where{' '}
            <span className="font-medium text-foreground">{challengeTitle || 'your challenge'}</span>{' '}
            will be published before it goes live.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-border bg-muted text-foreground">
              {ENGAGEMENT_LABELS[engagement]}
            </Badge>
          </div>

          <Row icon={Users} label="Sent to" value={audienceLabel} />
          <Row icon={Eye} label="Visibility" value={visibilityLabel} />
          <Row
            icon={Clock}
            label="Notification cadence"
            value={`${NOTIFICATION_CADENCE_COPY.certified} ${NOTIFICATION_CADENCE_COPY.standard}`}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Publishing…' : 'Publish now'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
