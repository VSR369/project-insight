/**
 * ScreeningReviewPage — /cogni/challenges/:id/screen
 * Screening & shortlisting review for submitted abstracts.
 * Enterprise: ER role sees anonymous IDs. Lightweight: Challenge owner sees real names.
 * Two-panel layout: abstract list (left) + detail/scoring (right).
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  useScreeningData,
  useScoreAbstract,
  useShortlistAbstract,
  useRejectAbstract,
  useApproveShortlist,
  type ScreeningAbstract,
  type EvaluationCriterion,
} from '@/hooks/cogniblend/useScreeningReview';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { toast } from 'sonner';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Shield,
  FileText,
  Bot,
  Lock,
  AlertTriangle,
} from 'lucide-react';

/* ─── Status Badge ───────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SHORTLISTED':
    case 'APPROVED_SHORTLIST':
      return <Badge className="bg-emerald-600/15 text-emerald-700 border-emerald-300">Shortlisted</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

/* ─── Scoring Panel ──────────────────────────────────────── */

interface ScoringPanelProps {
  criteria: EvaluationCriterion[];
  scores: Record<string, number>;
  onScoreChange: (criterion: string, score: number) => void;
  commentary: string;
  onCommentaryChange: (value: string) => void;
  isStructuredOrAbove: boolean;
  weightedTotal: number | null;
  readOnly: boolean;
}

function ScoringPanel({
  criteria,
  scores,
  onScoreChange,
  commentary,
  onCommentaryChange,
  isStructuredOrAbove,
  weightedTotal,
  readOnly,
}: ScoringPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Evaluation Scoring</h3>

      {criteria.length === 0 ? (
        <p className="text-sm text-muted-foreground">No evaluation criteria defined for this challenge.</p>
      ) : (
        <div className="space-y-3">
          {criteria.map((c) => (
            <div key={c.criterion_name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.criterion_name}</p>
                <p className="text-xs text-muted-foreground">{c.weight_percentage}% weight</p>
              </div>
              <Input
                type="number"
                min={1}
                max={10}
                value={scores[c.criterion_name] ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 10) {
                    onScoreChange(c.criterion_name, val);
                  } else if (e.target.value === '') {
                    onScoreChange(c.criterion_name, 0);
                  }
                }}
                className="w-20 text-center"
                placeholder="1-10"
                disabled={readOnly}
              />
            </div>
          ))}

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Weighted Total</p>
            <span className="text-lg font-bold text-primary">
              {weightedTotal != null ? `${weightedTotal.toFixed(2)} / 10` : '—'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Commentary {isStructuredOrAbove && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          value={commentary}
          onChange={(e) => onCommentaryChange(e.target.value)}
          placeholder={isStructuredOrAbove ? 'Required for Structured/Controlled modes (min 100 chars)...' : 'Optional commentary...'}
          rows={4}
          disabled={readOnly}
        />
        {isStructuredOrAbove && (
          <p className="text-xs text-muted-foreground">{commentary.length}/100 characters minimum</p>
        )}
      </div>
    </div>
  );
}

/* ─── AI Evaluation Placeholder ──────────────────────────── */

function AIEvaluationPlaceholder() {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="p-6 text-center space-y-3">
        <Bot className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium text-muted-foreground">AI Analysis</p>
        <p className="text-xs text-muted-foreground">Available in future update (M-23)</p>
      </CardContent>
    </Card>
  );
}

/* ─── Abstract Detail View ───────────────────────────────── */

interface AbstractDetailProps {
  abstract: ScreeningAbstract;
  criteria: EvaluationCriterion[];
  isStructuredMode: boolean;
  reviewerId: string;
  shortlistApproved: boolean;
}

function AbstractDetail({ abstract, criteria, isStructuredMode, reviewerId, shortlistApproved }: AbstractDetailProps) {
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
              This abstract will be marked as rejected. The solver will be notified when the shortlist is approved.
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

/* ─── Page Component ─────────────────────────────────────── */

export default function ScreeningReviewPage() {
  // ═══ SECTION 1: useState ═══
  const [selectedAbstractId, setSelectedAbstractId] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);

  // ═══ SECTION 2: Context & hooks ═══
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  // ═══ SECTION 3: Queries ═══
  const { data: roles } = useUserChallengeRoles(userId, challengeId);
  const { data, isLoading, error } = useScreeningData(challengeId, userId);
  const approveMutation = useApproveShortlist();

  // ═══ SECTION 4: Derived ═══
  const hasERRole = roles?.includes('ER') ?? false;
  const hasCURole = roles?.includes('CU') ?? false;
  const isStructuredMode = data?.isBlindMode ?? false;

  // Access: ER role for Structured+, or challenge owner (any role) for Quick
  const hasAccess = isStructuredMode ? hasERRole : true;

  const selectedAbstract = data?.abstracts.find(a => a.id === selectedAbstractId) ?? null;

  const shortlistedCount = data?.abstracts.filter(a => a.selectionStatus === 'SHORTLISTED' || a.selectionStatus === 'APPROVED_SHORTLIST').length ?? 0;
  const rejectedCount = data?.abstracts.filter(a => a.selectionStatus === 'REJECTED').length ?? 0;
  const pendingCount = data?.abstracts.filter(a => a.selectionStatus === 'PENDING').length ?? 0;

  const canApproveShortlist = (isStructuredMode ? hasCURole : true) && pendingCount === 0 && shortlistedCount > 0 && !data?.shortlistApproved;

  // ═══ SECTION 5: Conditional returns ═══
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px]" />
          <div className="lg:col-span-2">
            <Skeleton className="h-[500px]" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-foreground">Failed to load screening data.</p>
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center space-y-3">
            <Shield className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-medium text-foreground">Access Denied</p>
            <p className="text-xs text-muted-foreground">
              {isStructuredMode
                ? 'You need the ER (Evaluation Reviewer) role to access screening.'
                : 'You do not have permission to screen this challenge.'}
            </p>
            <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ SECTION 6: Handlers ═══
  const handleApproveShortlist = () => {
    if (!challengeId) return;
    approveMutation.mutate({ challengeId });
    setApproveDialogOpen(false);
  };

  // ═══ SECTION 7: Render ═══
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/cogni/challenges/${challengeId}/manage`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Abstract Screening</h1>
            <p className="text-sm text-muted-foreground truncate">{data.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{data.abstracts.length} submitted</Badge>
          {shortlistedCount > 0 && (
            <Badge className="bg-emerald-600/15 text-emerald-700 border-emerald-300">{shortlistedCount} shortlisted</Badge>
          )}
          {rejectedCount > 0 && (
            <Badge variant="destructive">{rejectedCount} rejected</Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="outline">{pendingCount} pending</Badge>
          )}
        </div>
      </div>

      {/* Approve Shortlist Action */}
      {canApproveShortlist && (
        <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex flex-col lg:flex-row items-start lg:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Ready to approve shortlist</p>
              <p className="text-xs text-muted-foreground">
                All abstracts have been reviewed. Approve to lock the shortlist and notify solvers.
              </p>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setApproveDialogOpen(true)}
              disabled={approveMutation.isPending}
            >
              <Lock className="h-4 w-4 mr-1.5" />
              {approveMutation.isPending ? 'Approving...' : 'Approve Shortlist'}
            </Button>
          </CardContent>
        </Card>
      )}

      {data.shortlistApproved && (
        <Card className="border-muted-foreground/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Shortlist has been approved and locked. Solvers have been notified.</p>
          </CardContent>
        </Card>
      )}

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Left Panel: Abstract List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Submitted Abstracts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.abstracts.length === 0 ? (
              <div className="p-6 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No abstracts submitted yet.</p>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
                {data.abstracts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAbstractId(a.id)}
                    className={`w-full text-left px-4 py-3 border-b border-border last:border-b-0 transition-colors hover:bg-accent/50 ${
                      selectedAbstractId === a.id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {isStructuredMode ? a.anonymousLabel : a.providerName ?? a.anonymousLabel}
                      </span>
                      <StatusBadge status={a.selectionStatus} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : 'N/A'}
                      {a.weightedTotal != null && ` · Score: ${a.weightedTotal.toFixed(1)}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel: Detail View */}
        <div className="lg:col-span-2">
          {selectedAbstract ? (
            <Card>
              <CardContent className="p-4 lg:p-6">
                <AbstractDetail
                  key={selectedAbstract.id}
                  abstract={selectedAbstract}
                  criteria={data.evaluationCriteria}
                  isEnterprise={isStructuredMode}
                  reviewerId={userId!}
                  shortlistApproved={data.shortlistApproved}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-[400px]">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Select an abstract from the list to begin review</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approve Shortlist Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve final shortlist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will lock the shortlist and notify all solvers of their status.
              {shortlistedCount > 0 && ` ${shortlistedCount} solver(s) will be shortlisted.`}
              {rejectedCount > 0 && ` ${rejectedCount} solver(s) will be rejected.`}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveShortlist}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve & Notify'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
