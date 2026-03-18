/**
 * DuplicateReviewPanel — Shown on challenge management view for Curator (MP) / Creator (AGG).
 * Displays pending duplicate reviews and provides Confirm/Dismiss actions.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  usePendingDuplicateReviews,
  useResolveDuplicateReview,
  type DuplicateReview,
} from '@/hooks/cogniblend/useDuplicateReview';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Copy,
} from 'lucide-react';

/* ─── Status Badge ───────────────────────────────────────── */

function ReviewStatusBadge({ status }: { status: DuplicateReview['status'] }) {
  switch (status) {
    case 'CONFIRMED_DUPLICATE':
      return <Badge variant="destructive">Confirmed Duplicate</Badge>;
    case 'DISMISSED':
      return <Badge variant="secondary">Dismissed</Badge>;
    default:
      return <Badge className="bg-amber-500/15 text-amber-700 border-amber-300">Pending Review</Badge>;
  }
}

/* ─── Main Panel ─────────────────────────────────────────── */

interface DuplicateReviewPanelProps {
  challengeId: string;
}

export function DuplicateReviewPanel({ challengeId }: DuplicateReviewPanelProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    review: DuplicateReview;
    action: 'CONFIRMED_DUPLICATE' | 'DISMISSED';
  } | null>(null);
  const [notes, setNotes] = useState('');

  const { user } = useAuth();
  const userId = user?.id;
  const { data: reviews, isLoading } = usePendingDuplicateReviews(challengeId);
  const resolveMutation = useResolveDuplicateReview();

  if (isLoading || !reviews || reviews.length === 0) return null;

  const pendingReviews = reviews.filter(r => r.status === 'PENDING');
  const resolvedReviews = reviews.filter(r => r.status !== 'PENDING');

  if (pendingReviews.length === 0 && resolvedReviews.length === 0) return null;

  const handleResolve = () => {
    if (!confirmDialog || !userId) return;
    resolveMutation.mutate({
      reviewId: confirmDialog.review.id,
      challengeId,
      resolution: confirmDialog.action,
      userId,
      notes: notes.trim() || undefined,
    });
    setConfirmDialog(null);
    setNotes('');
  };

  return (
    <Card className="border-amber-500/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Copy className="h-4 w-4 text-amber-600" />
          Duplicate Detection
          {pendingReviews.length > 0 && (
            <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px]">
              {pendingReviews.length} pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Pending reviews */}
        {pendingReviews.map(review => (
          <div
            key={review.id}
            className="border border-amber-300/50 rounded-lg p-4 space-y-3 bg-amber-50/30 dark:bg-amber-950/10"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    Possible duplicate detected
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Similarity: <strong>{review.similarity_percent}%</strong> match with:
                </p>
                <Link
                  to={`/cogni/challenges/${review.matched_challenge_id}/manage`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {review.matchedChallengeTitle}
                  <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                </Link>
                {review.matchedChallengeStatus && (
                  <Badge variant="secondary" className="text-[10px]">
                    {review.matchedChallengeStatus}
                  </Badge>
                )}
              </div>
              <ReviewStatusBadge status={review.status} />
            </div>

            <div className="flex flex-col lg:flex-row gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDialog({ review, action: 'CONFIRMED_DUPLICATE' })}
                disabled={resolveMutation.isPending}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Confirm Duplicate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog({ review, action: 'DISMISSED' })}
                disabled={resolveMutation.isPending}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Dismiss
              </Button>
            </div>
          </div>
        ))}

        {/* Resolved reviews (collapsed summary) */}
        {resolvedReviews.length > 0 && (
          <div className="space-y-2">
            {resolvedReviews.map(review => (
              <div
                key={review.id}
                className="flex items-center justify-between gap-2 p-2 rounded border border-border text-xs"
              >
                <span className="text-muted-foreground truncate">
                  vs. {review.matchedChallengeTitle}
                </span>
                <ReviewStatusBadge status={review.status} />
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog
          open={!!confirmDialog}
          onOpenChange={(open) => { if (!open) { setConfirmDialog(null); setNotes(''); } }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog?.action === 'CONFIRMED_DUPLICATE'
                  ? 'Confirm Duplicate?'
                  : 'Dismiss Duplicate Flag?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog?.action === 'CONFIRMED_DUPLICATE'
                  ? 'This will terminate the challenge and suggest linking to the existing one. This action cannot be undone.'
                  : 'This will remove the duplicate flag and allow the challenge to proceed normally.'}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 py-2">
              <Label className="text-sm">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add review notes..."
                rows={2}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResolve}
                className={
                  confirmDialog?.action === 'CONFIRMED_DUPLICATE'
                    ? 'bg-destructive hover:bg-destructive/90'
                    : ''
                }
              >
                {confirmDialog?.action === 'CONFIRMED_DUPLICATE'
                  ? 'Confirm & Terminate'
                  : 'Dismiss Flag'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

/* ─── DuplicateFlagBadge — Small badge for challenge cards ── */

export function DuplicateFlagBadge({ hasPendingFlag }: { hasPendingFlag: boolean }) {
  if (!hasPendingFlag) return null;
  return (
    <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-[10px] gap-1">
      <Copy className="h-3 w-3" />
      Duplicate Flagged
    </Badge>
  );
}
