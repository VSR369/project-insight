/** AbstractDetail — single abstract view with scoring and shortlist/reject actions. */
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, FileText, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useScoreAbstract, useShortlistAbstract, useRejectAbstract,
  type ScreeningAbstract, type EvaluationCriterion,
} from '@/hooks/cogniblend/useScreeningReview';
import { StatusBadge, ScoringPanel, AIEvaluationPlaceholder } from './ScreeningScoringParts';

/* ─── Abstract Detail View ───────────────────────────────── */

export interface AbstractDetailProps {
  abstract: ScreeningAbstract;
  criteria: EvaluationCriterion[];
  isStructuredMode: boolean;
  reviewerId: string;
  shortlistApproved: boolean;
}

export function AbstractDetail({ abstract, criteria, isStructuredMode, reviewerId, shortlistApproved }: AbstractDetailProps) {
  const [scores, setScores] = useState<Record<string, number>>(abstract.existingScores ?? {});
  const [commentary, setCommentary] = useState(abstract.existingCommentary ?? '');
  const [confirmAction, setConfirmAction] = useState<'shortlist' | 'reject' | null>(null);

  const scoreMutation = useScoreAbstract();
  const shortlistMutation = useShortlistAbstract();
  const rejectMutation = useRejectAbstract();

  const isDecided = abstract.selectionStatus !== 'PENDING';
  const readOnly = isDecided || shortlistApproved;

  const weightedTotal = useMemo(() => {
    if (criteria.length === 0) return null;
    let total = 0;
    let weightSum = 0;
    for (const c of criteria) {
      const score = scores[c.criterion_name];
      if (score && score > 0) {
        total += score * (c.weight_percentage / 100);
        weightSum += c.weight_percentage;
      }
    }
    return weightSum > 0 ? Math.round(total * 100) / 100 : null;
  }, [scores, criteria]);

  const handleSaveScores = () => {
    const commentaryValid = !isStructuredMode || commentary.trim().length >= 100;
    if (!commentaryValid) {
      toast.error('Commentary must be at least 100 characters for Enterprise challenges.');
      return;
    }
    scoreMutation.mutate({
      existingEvalId: abstract.existingEvalId,
      solutionId: abstract.id,
      reviewerId,
      rubricScores: scores,
      commentary: commentary.trim(),
      individualScore: weightedTotal ?? 0,
    });
  };

  const handleShortlist = () => {
    shortlistMutation.mutate({ solutionId: abstract.id });
    setConfirmAction(null);
  };

  const handleReject = () => {
    rejectMutation.mutate({ solutionId: abstract.id });
    setConfirmAction(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-foreground">
            {isStructuredMode ? abstract.anonymousLabel : abstract.providerName ?? abstract.anonymousLabel}
          </h2>
          <p className="text-xs text-muted-foreground">
            Submitted {abstract.submittedAt ? new Date(abstract.submittedAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <StatusBadge status={abstract.selectionStatus} />
      </div>

      {/* Abstract Content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Approach Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">{abstract.abstractText ?? 'No content'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Proposed Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">{abstract.methodology ?? 'No content'}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Estimated Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{abstract.timeline ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Usage Declaration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{abstract.aiUsageDeclaration ?? '—'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Relevant Experience</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">{abstract.experience ?? 'No content'}</p>
        </CardContent>
      </Card>

      <Separator />

      {/* AI Analysis Placeholder */}
      <AIEvaluationPlaceholder />

      <Separator />

      {/* Scoring */}
      <ScoringPanel
        criteria={criteria}
        scores={scores}
        onScoreChange={(criterion, score) => setScores(prev => ({ ...prev, [criterion]: score }))}
        commentary={commentary}
        onCommentaryChange={setCommentary}
        isStructuredOrAbove={isStructuredMode}
        weightedTotal={weightedTotal}
        readOnly={readOnly}
      />

      {/* Actions */}
      {!readOnly && (
        <div className="flex flex-col lg:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleSaveScores}
            disabled={scoreMutation.isPending}
          >
            {scoreMutation.isPending ? 'Saving...' : 'Save Scores'}
          </Button>
          <div className="flex-1" />
          <Button
            variant="destructive"
            onClick={() => setConfirmAction('reject')}
            disabled={rejectMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Reject
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setConfirmAction('shortlist')}
            disabled={shortlistMutation.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Shortlist
          </Button>
        </div>
      )}

      {readOnly && shortlistApproved && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Shortlist has been approved and locked.</p>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <AlertDialog open={confirmAction === 'shortlist'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shortlist this abstract?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the abstract as shortlisted for the next evaluation stage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleShortlist} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm Shortlist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'reject'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this abstract?</AlertDialogTitle>
            <AlertDialogDescription>
              This abstract will be marked as rejected. The Solution Provider will be notified when the shortlist is approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} className="bg-destructive hover:bg-destructive/90">
              Confirm Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
