/**
 * LcReviewPanel — 360-degree challenge review panel for Legal Coordinator.
 * Route: /cogni/legal-review/:challengeId
 *
 * Left panel: Read-only view of ALL challenge fields.
 * Right panel: Legal documents with per-document approve/reject/upload actions.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, FileUp, MessageSquare, FileText, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CACHE_FREQUENT } from '@/config/queryCache';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

/* ─── Challenge detail hook (360-degree view) ────────── */

function useChallengeDetail(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['lc-challenge-detail', challengeId],
    queryFn: async () => {
      if (!challengeId) throw new Error('Challenge ID required');

      const { data, error } = await supabase
        .from('challenges')
        .select(`
          id, title, problem_statement, scope, description,
          deliverables, evaluation_criteria, reward_structure,
          maturity_level, phase_schedule, complexity_parameters,
          complexity_score, complexity_level, ip_model,
          visibility, eligibility, governance_profile,
          current_phase, master_status, operating_model,
          lc_review_required, created_at
        `)
        .eq('id', challengeId)
        .eq('is_deleted', false)
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

/* ─── Legal docs hook ────────────────────────────────── */

function useLegalDocsForReview(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['lc-legal-docs', challengeId],
    queryFn: async () => {
      if (!challengeId) throw new Error('Challenge ID required');

      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, tier, status, lc_status, lc_reviewed_by, lc_reviewed_at, lc_review_notes, template_version, created_at')
        .eq('challenge_id', challengeId)
        .order('tier')
        .order('document_type');

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!challengeId,
    ...CACHE_FREQUENT,
  });
}

/* ─── LC action mutation ─────────────────────────────── */

function useLcDocAction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      documentId: string;
      challengeId: string;
      action: 'approved' | 'rejected' | 'revision_requested';
      notes: string;
    }) => {
      if (!user?.id) throw new Error('Authentication required');

      const { error } = await supabase
        .from('challenge_legal_docs')
        .update({
          lc_status: params.action,
          lc_reviewed_by: user.id,
          lc_reviewed_at: new Date().toISOString(),
          lc_review_notes: params.notes || null,
          updated_by: user.id,
        } as any)
        .eq('id', params.documentId);

      if (error) throw new Error(error.message);

      // Also update related legal_review_requests to 'completed' if action is approved
      if (params.action === 'approved') {
        await supabase
          .from('legal_review_requests' as any)
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            notes: params.notes || null,
            updated_by: user.id,
          })
          .eq('document_id', params.documentId)
          .eq('status', 'pending');
      }

      return params;
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ['lc-legal-docs', params.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['lc-review-status', params.challengeId] });
      queryClient.invalidateQueries({ queryKey: ['lc-review-queue'] });
      const actionLabel = params.action === 'approved' ? 'approved' : params.action === 'rejected' ? 'rejected' : 'revision requested';
      toast.success(`Document ${actionLabel} successfully`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update document: ${error.message}`);
    },
  });
}

/* ─── LC Status Badge ────────────────────────────────── */

function LcStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline" className="text-xs">Not reviewed</Badge>;
  switch (status) {
    case 'approved':
      return <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    case 'rejected':
      return <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 text-xs"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    case 'pending_review':
      return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">Pending Review</Badge>;
    case 'revision_requested':
      return <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 text-xs">Revision Requested</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

/* ─── Detail field renderer ──────────────────────────── */

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm">{value || <span className="text-muted-foreground italic">Not set</span>}</dd>
    </div>
  );
}

function JsonField({ label, value }: { label: string; value: unknown }) {
  if (!value) return <DetailField label={label} value={null} />;
  return (
    <DetailField
      label={label}
      value={
        <pre className="text-xs bg-muted/50 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
          {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        </pre>
      }
    />
  );
}

/* ─── Document action card ───────────────────────────── */

function DocActionCard({ doc, challengeId, onAction }: {
  doc: any;
  challengeId: string;
  onAction: (docId: string, action: 'approved' | 'rejected' | 'revision_requested', notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const isPending = doc.lc_status === 'pending_review' || doc.lc_status === null;

  return (
    <Card className="border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">{doc.document_name || doc.document_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{doc.tier}</Badge>
              <span className="text-xs text-muted-foreground">{doc.document_type}</span>
            </div>
          </div>
          <LcStatusBadge status={doc.lc_status} />
        </div>

        {doc.lc_review_notes && (
          <div className="bg-muted/50 rounded p-2 text-xs">
            <span className="font-medium">Previous notes:</span> {doc.lc_review_notes}
          </div>
        )}

        {isPending && (
          <>
            <Textarea
              placeholder="Add review notes (optional for approval, required for rejection)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[60px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => onAction(doc.id, 'approved', notes)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject document?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The Challenge Creator / Architect will be notified and must upload a revised version.
                      {!notes.trim() && ' Please add review notes before rejecting.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      disabled={!notes.trim()}
                      onClick={() => onAction(doc.id, 'rejected', notes)}
                    >
                      Confirm Reject
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(doc.id, 'revision_requested', notes)}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1" /> Request Revision
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Page component ─────────────────────────────────── */

export default function LcReviewPanel() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { data: challenge, isLoading: challengeLoading } = useChallengeDetail(challengeId);
  const { data: docs, isLoading: docsLoading } = useLegalDocsForReview(challengeId);
  const lcAction = useLcDocAction();

  const isLoading = challengeLoading || docsLoading;

  const handleAction = (docId: string, action: 'approved' | 'rejected' | 'revision_requested', notes: string) => {
    if (!challengeId) return;
    lcAction.mutate({ documentId: docId, challengeId, action, notes });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Challenge not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/legal-review')}>
          Back to Queue
        </Button>
      </div>
    );
  }

  const pendingDocs = docs?.filter((d) => d.lc_status === 'pending_review' || d.lc_status === null) ?? [];
  const reviewedDocs = docs?.filter((d) => d.lc_status && d.lc_status !== 'pending_review') ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/legal-review')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-xl font-bold tracking-tight">{challenge.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Shield className="h-3.5 w-3.5" />
            {challenge.governance_profile} · Phase {challenge.current_phase} · {challenge.master_status}
            {challenge.lc_review_required && (
              <Badge variant="outline" className="text-xs border-primary/30 text-primary ml-2">LC Mandatory</Badge>
            )}
          </p>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: 360-degree challenge details */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-base">Challenge Details (Read-Only)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <DetailField label="Title" value={challenge.title} />
            <DetailField label="Problem Statement" value={challenge.problem_statement} />
            <DetailField label="Scope" value={challenge.scope} />
            <DetailField label="Description" value={challenge.description} />
            <Separator />
            <DetailField label="Maturity Level" value={challenge.maturity_level} />
            <DetailField label="Complexity Level" value={challenge.complexity_level} />
            <DetailField label="Complexity Score" value={challenge.complexity_score?.toString()} />
            <DetailField label="IP Model" value={challenge.ip_model} />
            <DetailField label="Visibility" value={challenge.visibility} />
            <DetailField label="Eligibility" value={challenge.eligibility} />
            <DetailField label="Operating Model" value={challenge.operating_model} />
            <Separator />
            <JsonField label="Deliverables" value={challenge.deliverables} />
            <JsonField label="Evaluation Criteria" value={challenge.evaluation_criteria} />
            <JsonField label="Reward Structure" value={challenge.reward_structure} />
            <JsonField label="Phase Schedule" value={challenge.phase_schedule} />
            <JsonField label="Complexity Parameters" value={challenge.complexity_parameters} />
          </CardContent>
        </Card>

        {/* RIGHT PANEL: Legal documents with actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2">
                Legal Documents
                <Badge variant="outline" className="text-xs">
                  {docs?.length ?? 0} doc(s)
                </Badge>
                {pendingDocs.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                    {pendingDocs.length} pending
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {!docs || docs.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No legal documents attached.</p>
                </div>
              ) : (
                <>
                  {pendingDocs.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pending Review</h3>
                      {pendingDocs.map((doc) => (
                        <DocActionCard key={doc.id} doc={doc} challengeId={challengeId!} onAction={handleAction} />
                      ))}
                    </div>
                  )}
                  {reviewedDocs.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reviewed</h3>
                      {reviewedDocs.map((doc) => (
                        <DocActionCard key={doc.id} doc={doc} challengeId={challengeId!} onAction={handleAction} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
