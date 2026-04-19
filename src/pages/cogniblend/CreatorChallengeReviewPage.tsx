/**
 * CreatorChallengeReviewPage — Creator approval review for curated challenges.
 *
 * Route: /cogni/challenges/:id/creator-review
 *
 * Composition only — all data + mutations come from useCreatorReview.
 */
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Send, MessageSquareWarning, Clock, ShieldAlert } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useCreatorReview, CREATOR_EDITABLE_SECTIONS, AGG_RESTRICTED_SECTIONS } from '@/hooks/cogniblend/useCreatorReview';
import { PreviewDocument } from '@/components/cogniblend/preview/PreviewDocument';
import { LegalDocEditorPanel } from '@/components/cogniblend/legal/LegalDocEditorPanel';
import { CreatorApprovalStatusBanner } from '@/components/cogniblend/creator/CreatorApprovalStatusBanner';
import { Pass3StaleAlert } from '@/components/cogniblend/creator/Pass3StaleAlert';
import { RequestRecurationModal } from '@/components/cogniblend/creator/RequestRecurationModal';

export default function CreatorChallengeReviewPage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const review = useCreatorReview(challengeId);
  const [showRecurationModal, setShowRecurationModal] = useState(false);

  const canEditSection = useCallback(
    (key: string): boolean => {
      if (!review.canEdit) return false;
      if (!CREATOR_EDITABLE_SECTIONS.has(key)) return false;
      if (review.isAGG && AGG_RESTRICTED_SECTIONS.has(key)) return false;
      return true;
    },
    [review.canEdit, review.isAGG],
  );

  const countdown = useMemo(() => {
    if (!review.timeoutDate) return null;
    if (review.isTimedOut) return 'Approval window expired';
    return `${formatDistanceToNowStrict(review.timeoutDate)} remaining`;
  }, [review.timeoutDate, review.isTimedOut]);

  // ── Auth/loading states ────────────────────────────────
  if (authLoading || review.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    navigate('/cogni/login');
    return null;
  }

  if (!challengeId || !review.challenge) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Challenge not found.
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Access denied (no CR role) ─────────────────────────
  if (!review.hasCRRole) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You don't have permission to review this challenge.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/cogni/my-challenges')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to My Challenges
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Not awaiting approval ──────────────────────────────
  const inActiveReviewState =
    review.status === 'pending' || review.isApproved || review.status === 'changes_submitted';
  if (!inActiveReviewState) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not awaiting your approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This challenge is not currently awaiting your approval.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/cogni/my-challenges')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to My Challenges
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const actionsDisabled = review.isApproved || review.isAccepting || review.isSubmittingEdits || review.isRequestingRecuration;

  const ActionButtons = ({ position }: { position: 'top' | 'bottom' }) => (
    <div className="flex flex-wrap gap-2" data-position={position}>
      <Button
        size="sm"
        onClick={review.acceptAll}
        disabled={actionsDisabled}
        className="bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {review.isAccepting ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
        )}
        Accept All
      </Button>
      <Button
        size="sm"
        onClick={review.submitEdits}
        disabled={actionsDisabled || !review.hasEdits}
      >
        {review.isSubmittingEdits ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <Send className="h-4 w-4 mr-1.5" />
        )}
        Submit with Edits {review.hasEdits ? `(${Object.keys(review.editedSections).length})` : ''}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowRecurationModal(true)}
        disabled={actionsDisabled}
      >
        <MessageSquareWarning className="h-4 w-4 mr-1.5" />
        Request Re-curation
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 lg:p-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          to="/cogni/my-challenges"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Challenges
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-foreground">{review.challenge.title}</h1>
            <p className="text-xs text-muted-foreground">
              Creator approval review
              {countdown && (
                <span className="ml-2 inline-flex items-center gap-1 text-amber-600">
                  <Clock className="h-3 w-3" />
                  {countdown}
                </span>
              )}
            </p>
          </div>
          <ActionButtons position="top" />
        </div>
      </div>

      {/* Status banner */}
      <CreatorApprovalStatusBanner
        status={review.status}
        approvedAt={review.approvedAt}
        notes={review.notes}
      />

      {/* Pass 3 stale notice (informational) */}
      {review.pass3Stale && <Pass3StaleAlert />}

      {/* Challenge body */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <PreviewDocument
            challenge={review.challenge}
            orgData={review.orgData}
            legalDetails={review.legalDetails}
            escrowRecord={review.escrowRecord}
            digest={review.digest}
            attachments={review.attachments}
            canEditSection={canEditSection}
            isGlobalReadOnly={!review.canEdit}
          />
        </CardContent>
      </Card>

      {/* Legal documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span>Legal Documents — {review.isMP ? 'Review Required' : 'Optional Review'}</span>
            {review.isAGG && (
              <div className="flex items-center gap-2">
                <Switch
                  id="show-legal"
                  checked={review.showLegalToggle}
                  onCheckedChange={review.setShowLegalToggle}
                />
                <Label htmlFor="show-legal" className="text-xs font-normal">
                  I want to review legal documents
                </Label>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        {review.showLegalDocs && (
          <CardContent>
            {review.legalDocHtml ? (
              <LegalDocEditorPanel
                content={review.legalDocHtml}
                onChange={() => {
                  /* read-only */
                }}
                readOnly
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Legal documents are being prepared by the Curator.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Footer actions */}
      <div className="border-t pt-4 flex justify-end">
        <ActionButtons position="bottom" />
      </div>

      <RequestRecurationModal
        open={showRecurationModal}
        onOpenChange={setShowRecurationModal}
        onSubmit={(reason) => {
          review.requestRecuration(reason);
          setShowRecurationModal(false);
        }}
        isSubmitting={review.isRequestingRecuration}
      />
    </div>
  );
}
