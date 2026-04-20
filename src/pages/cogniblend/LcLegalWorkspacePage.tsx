/**
 * LcLegalWorkspacePage — AI-assisted Legal Coordinator workspace.
 * Route: /cogni/challenges/:id/lc-legal
 *
 * Thin orchestrator: hooks at top, conditional returns, JSX composition of
 * extracted components. Business logic & mutations live here; presentation
 * lives in src/components/cogniblend/lc/*.
 */
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, Loader2, Send, Shield } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { usePwaStatus } from '@/hooks/cogniblend/usePwaStatus';
import { handleMutationError } from '@/lib/errorHandler';
import { sanitizeFileName } from '@/lib/sanitizeFileName';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { PwaAcceptanceGate } from '@/components/cogniblend/workforce/PwaAcceptanceGate';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { AssembledCpaSection } from '@/components/cogniblend/lc/AssembledCpaSection';
import { LcReturnToCurator } from '@/components/cogniblend/lc/LcReturnToCurator';
import { LcApproveAction } from '@/components/cogniblend/lc/LcApproveAction';
import { LcFullChallengePreview } from '@/components/cogniblend/lc/LcFullChallengePreview';
import { LcAttachedDocsCard } from '@/components/cogniblend/lc/LcAttachedDocsCard';
import { LcAiSuggestionsSection } from '@/components/cogniblend/lc/LcAiSuggestionsSection';
import { LcPass3ReviewPanel } from '@/components/cogniblend/lc/LcPass3ReviewPanel';
import { LcAddDocumentForm } from '@/components/cogniblend/lc/LcAddDocumentForm';

import {
  useAttachedLegalDocs,
  useChallengeForLC,
  usePersistedSuggestions,
} from '@/hooks/cogniblend/useLcLegalData';
import type { DocEditState, SuggestedDoc } from '@/lib/cogniblend/lcLegalHelpers';

export default function LcLegalWorkspacePage() {
  // ── Hooks (all at top level) ──
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: roles } = useUserChallengeRoles(user?.id, challengeId);
  const { data: challenge, isLoading: challengeLoading } = useChallengeForLC(challengeId);
  const { data: attachedDocs, isLoading: attachedLoading } = useAttachedLegalDocs(challengeId);
  const { data: aiSuggestions, isLoading: suggestionsQueryLoading } = usePersistedSuggestions(challengeId);

  const opModel = challenge?.operating_model ?? 'IP';
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(
    opModel === 'MP' ? user?.id : undefined,
  );
  const [pwaAccepted, setPwaAccepted] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [docEdits, setDocEdits] = useState<Record<string, DocEditState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [gateFailures, setGateFailures] = useState<string[]>([]);
  const [savingContent, setSavingContent] = useState<string | null>(null);

  // Add-doc form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const [newDocTier, setNewDocTier] = useState('TIER_1');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [addingDoc, setAddingDoc] = useState(false);

  // Derived
  const isLC = roles?.includes('LC') ?? false;
  const hasAccess = isLC || (roles?.includes('CR') ?? false);

  const getDocEdit = useCallback(
    (docType: string): DocEditState =>
      docEdits[docType] ?? { content: '', notes: '', file: null },
    [docEdits],
  );

  const updateDocEdit = useCallback(
    (docType: string, field: keyof DocEditState, value: string | File | null) => {
      setDocEdits((prev) => ({
        ...prev,
        [docType]: { ...(prev[docType] ?? { content: '', notes: '', file: null }), [field]: value },
      }));
    },
    [],
  );

  const initDocContent = useCallback((doc: SuggestedDoc) => {
    setDocEdits((prev) => {
      if (prev[doc.document_type]?.content) return prev;
      const existing = prev[doc.document_type] ?? { content: '', notes: '', file: null };
      return { ...prev, [doc.document_type]: { ...existing, content: doc.content_summary } };
    });
  }, []);

  // ── Generate (legacy individual-doc flow — no pass3_mode) ──
  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-legal-documents', {
        body: { challenge_id: challengeId },
      });
      if (error) throw new Error(error.message ?? 'Failed to get suggestions');
      if (!data?.success) throw new Error(data?.error?.message ?? 'AI suggestion failed');
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
      toast.success('Legal documents generated successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate';
      setGenerateError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // ── Mutations ──
  const acceptDocMutation = useMutation({
    mutationFn: async (doc: SuggestedDoc) => {
      if (!challengeId || !user?.id) throw new Error('Missing context');
      const edit = getDocEdit(doc.document_type);
      const { error } = await supabase.from('challenge_legal_docs').update({
        status: 'ATTACHED',
        content_summary: edit.content || doc.content_summary || null,
        lc_status: 'approved',
        lc_reviewed_by: user.id,
        lc_reviewed_at: new Date().toISOString(),
        lc_review_notes: edit.notes || `AI-suggested: ${doc.rationale}`,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any).eq('id', doc.id);
      if (error) throw new Error(error.message);

      if (edit.file && challengeId) {
        const safeName = sanitizeFileName(edit.file.name);
        const path = `${challengeId}/${doc.document_type}/${crypto.randomUUID()}_${safeName}`;
        await supabase.storage.from('legal-docs').upload(path, edit.file);
      }
      return doc.document_type;
    },
    onSuccess: (docType) => {
      toast.success(`${docType} document accepted and attached`);
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'accept_legal_doc' }),
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('challenge_legal_docs').delete().eq('id', docId);
      if (error) throw new Error(error.message);
      return docId;
    },
    onSuccess: () => {
      toast.success('Legal document deleted');
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
    },
    onError: (error: Error) => handleMutationError(error, { operation: 'delete_legal_doc' }),
  });

  const dismissSuggestionMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('challenge_legal_docs')
        .delete()
        .eq('id', docId)
        .eq('status', 'ai_suggested');
      if (error) throw new Error(error.message);
      return docId;
    },
    onSuccess: () => {
      toast.success('Suggestion dismissed');
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
    },
    onError: (error: Error) =>
      handleMutationError(error, { operation: 'dismiss_legal_suggestion' }),
  });

  const handleSaveContent = useCallback(
    async (doc: SuggestedDoc) => {
      if (!user?.id) return;
      const edit = getDocEdit(doc.document_type);
      const contentToSave = edit.content || doc.content_summary;
      if (!contentToSave) return;
      setSavingContent(doc.document_type);
      try {
        const { error } = await supabase.from('challenge_legal_docs').update({
          content_summary: contentToSave,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any).eq('id', doc.id);
        if (error) throw new Error(error.message);
        toast.success(`${doc.document_type} content saved`);
        queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSavingContent(null);
      }
    },
    [user?.id, getDocEdit, challengeId, queryClient],
  );

  const handleAddNewDoc = async () => {
    if (!challengeId || !user?.id || !newDocTitle || !newDocType) {
      toast.error('Please fill in title and document type');
      return;
    }
    setAddingDoc(true);
    try {
      const { data: existing } = await supabase
        .from('challenge_legal_docs')
        .select('id')
        .eq('challenge_id', challengeId)
        .eq('document_type', newDocType)
        .eq('tier', newDocTier)
        .maybeSingle();

      const payload = {
        status: 'ATTACHED',
        content_summary: newDocContent || null,
        lc_status: 'approved',
        lc_reviewed_by: user.id,
        lc_reviewed_at: new Date().toISOString(),
        lc_review_notes: newDocNotes || null,
        document_name: newDocTitle,
        maturity_level: challenge?.maturity_level ?? null,
        attached_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      if (existing?.id) {
        const { error } = await supabase
          .from('challenge_legal_docs')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('challenge_legal_docs').insert({
          challenge_id: challengeId,
          document_type: newDocType,
          tier: newDocTier,
          created_by: user.id,
          ...payload,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
        if (error) throw new Error(error.message);
      }

      if (newDocFile) {
        const safeName = sanitizeFileName(newDocFile.name);
        const path = `${challengeId}/${newDocType}/${crypto.randomUUID()}_${safeName}`;
        await supabase.storage.from('legal-docs').upload(path, newDocFile);
      }

      toast.success('Legal document added successfully');
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });

      setNewDocTitle('');
      setNewDocType('');
      setNewDocTier('TIER_1');
      setNewDocContent('');
      setNewDocNotes('');
      setNewDocFile(null);
      setShowAddForm(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add document';
      toast.error(msg);
    } finally {
      setAddingDoc(false);
    }
  };

  const handleSubmitToCuration = async () => {
    if (!challengeId || !user?.id) return;
    setSubmitting(true);
    setGateFailures([]);
    try {
      const { data: gateResult } = await supabase.rpc('validate_gate_02', {
        p_challenge_id: challengeId,
      });
      const gate = gateResult as unknown as { passed: boolean; failures: string[] } | null;
      if (!gate?.passed) {
        const failures = gate?.failures ?? ['Unknown validation failure'];
        setGateFailures(failures);
        toast.error(`Cannot advance: ${failures.join(', ')}`);
        return;
      }

      const { data: reviewResult, error } = await supabase.rpc('complete_legal_review', {
        p_challenge_id: challengeId,
        p_user_id: user.id,
      });
      if (error) throw new Error(error.message);

      const result = reviewResult as unknown as {
        success: boolean;
        phase_advanced: boolean;
        current_phase: number;
        message?: string;
        awaiting?: string;
        error?: string;
      };
      if (!result?.success) throw new Error(result?.error ?? 'Legal review RPC failed');

      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['curation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['challenge-preview', challengeId] });

      // S7C-2: surface the new Creator-approval pause when both compliance
      // flags are now true. Otherwise we are still waiting on FC.
      const msg = result.awaiting === 'creator_approval'
        ? 'Legal review complete — Creator approval requested'
        : result.phase_advanced
          ? 'Legal review complete — challenge advanced to next phase'
          : 'Legal review complete — waiting for financial compliance';
      toast.success(msg);
      if (result.phase_advanced) navigate('/cogni/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCard = useCallback((docType: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(docType)) next.delete(docType);
      else next.add(docType);
      return next;
    });
  }, []);

  // ── Conditional returns (AFTER all hooks) ──
  if (challengeLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (opModel === 'MP' && !hasPwa && !pwaAccepted && !pwaLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <PwaAcceptanceGate userId={user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">
              You need the Legal Coordinator (LC) role to access this workspace.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // S9R guard: STRUCTURED governance is handled entirely by the Curator.
  // LC must not act on these challenges — show empty state with back link.
  const challengeRecord = challenge as unknown as Record<string, unknown> | null;
  const govProfile = ((challengeRecord?.governance_mode_override
    ?? challengeRecord?.governance_profile
    ?? '') as string);
  const govUpper = govProfile.toUpperCase();
  if (govUpper === 'STRUCTURED' || govUpper === 'QUICK') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-semibold text-foreground">Not applicable for {govUpper.charAt(0) + govUpper.slice(1).toLowerCase()} governance</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              The Curator handles legal compliance for {govUpper.toLowerCase()} challenges. Legal Coordinator review is only required for Controlled or Enterprise governance modes.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/lc-queue')}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to LC Queue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleSuggestions = aiSuggestions ?? [];
  const hasSuggestions = visibleSuggestions.length > 0;
  const totalAccepted = attachedDocs?.length ?? 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/cogni/lc-queue" className="text-muted-foreground hover:text-foreground" aria-label="Back to LC queue">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Legal Coordinator Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Challenge:{' '}
            <span className="font-medium text-foreground">{challenge?.title ?? 'Untitled'}</span>
          </p>
        </div>
      </div>

      {/* S7D-1: read-only banner once LC has marked compliance complete */}
      {challenge?.lc_compliance_complete && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Legal Review Complete — Read Only</AlertTitle>
          <AlertDescription className="text-emerald-800 dark:text-emerald-300">
            You have submitted your legal review for this challenge. No further edits are required from you.
          </AlertDescription>
        </Alert>
      )}

      <WorkflowProgressBanner step={3} />

      <LcFullChallengePreview challengeId={challengeId!} />

      <AssembledCpaSection challengeId={challengeId!} />

      <Separator />

      <LcAttachedDocsCard
        docs={attachedDocs}
        isLoading={attachedLoading}
        currentUserId={user?.id}
        onDelete={(id) => deleteDocMutation.mutate(id)}
        isDeleting={deleteDocMutation.isPending}
      />

      {/* Pass 3 — Unified AI Legal Review (LC) */}
      {isLC && <LcPass3ReviewPanel challengeId={challengeId!} />}

      <Separator />

      <LcAiSuggestionsSection
        isLC={isLC}
        generating={generating}
        generateError={generateError}
        hasSuggestions={hasSuggestions}
        totalAccepted={totalAccepted}
        suggestionsLoading={suggestionsQueryLoading}
        visibleSuggestions={visibleSuggestions}
        onGenerate={handleGenerate}
        getDocEdit={getDocEdit}
        updateDocEdit={updateDocEdit}
        initDocContent={initDocContent}
        onAccept={(doc) => acceptDocMutation.mutate(doc)}
        onSaveContent={handleSaveContent}
        onDismiss={(id) => dismissSuggestionMutation.mutate(id)}
        isAccepting={acceptDocMutation.isPending}
        savingContent={savingContent}
        openCards={openCards}
        onToggleCard={toggleCard}
      />

      {isLC && (
        <LcAddDocumentForm
          open={showAddForm}
          onOpenChange={setShowAddForm}
          title={newDocTitle}
          onTitleChange={setNewDocTitle}
          docType={newDocType}
          onDocTypeChange={setNewDocType}
          tier={newDocTier}
          onTierChange={setNewDocTier}
          content={newDocContent}
          onContentChange={setNewDocContent}
          notes={newDocNotes}
          onNotesChange={setNewDocNotes}
          file={newDocFile}
          onFileChange={setNewDocFile}
          onSubmit={handleAddNewDoc}
          submitting={addingDoc}
        />
      )}

      <Separator />

      {/* GATE-02 failures */}
      {gateFailures.length > 0 && (
        <div className="space-y-3">
          {gateFailures.map((failure, idx) => {
            const isPendingDocs = failure.toLowerCase().includes('pending');
            return (
              <Alert key={idx} variant="destructive" className="border-destructive/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">Validation Failed</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p className="text-sm">{failure}</p>
                  {isPendingDocs && hasSuggestions && (
                    <p className="text-xs text-muted-foreground">
                      {visibleSuggestions.length} AI suggestion{visibleSuggestions.length !== 1 ? 's' : ''} still need to be Accepted or Dismissed above.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      {hasSuggestions && (
        <Alert className="border-destructive/20 bg-muted/30">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            <strong>{visibleSuggestions.length}</strong> AI-suggested document
            {visibleSuggestions.length !== 1 ? 's' : ''} pending review. Accept or Dismiss all before submitting to curation.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {totalAccepted} document{totalAccepted !== 1 ? 's' : ''} attached
            </p>
            <p className="text-xs text-muted-foreground">
              {challenge?.current_phase !== 2
                ? `Challenge is currently at Phase ${challenge?.current_phase ?? '?'}. It must be at Phase 2 before LC can submit to curation.`
                : 'Accept all required documents before submitting to curation.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LcReturnToCurator challengeId={challengeId!} userId={user?.id ?? ''} disabled={submitting} />
            <LcApproveAction challengeId={challengeId!} userId={user?.id ?? ''} disabled={submitting || totalAccepted === 0} />
          </div>
          <Button
            onClick={handleSubmitToCuration}
            disabled={
              submitting
              || totalAccepted === 0
              || challenge?.current_phase !== 2
              || !!challenge?.lc_compliance_complete
            }
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {challenge?.lc_compliance_complete ? 'Already Submitted' : 'Submit to Curation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
