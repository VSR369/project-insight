/**
 * LcLegalWorkspacePage — AI-assisted Legal Coordinator workspace.
 * Route: /cogni/challenges/:id/lc-legal
 *
 * LC receives challenge from Creator, AI suggests legal documents,
 * LC reviews/modifies/uploads, then submits to Curation (Phase 3).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { useCompletePhase } from '@/hooks/cogniblend/useCompletePhase';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Upload,
  Shield,
  AlertCircle,
  Send,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */

interface SuggestedDoc {
  document_type: string;
  tier: string;
  title: string;
  rationale: string;
  content_summary: string;
  priority: 'required' | 'recommended';
}

interface AISuggestion {
  summary: string;
  documents: SuggestedDoc[];
}

/* ─── Hook: fetch AI suggestions ─────────────────────────── */

function useLegalSuggestions(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['legal-suggestions', challengeId],
    queryFn: async (): Promise<AISuggestion> => {
      const { data, error } = await supabase.functions.invoke('suggest-legal-documents', {
        body: { challenge_id: challengeId },
      });
      if (error) throw new Error(error.message ?? 'Failed to get suggestions');
      if (!data?.success) throw new Error(data?.error?.message ?? 'AI suggestion failed');
      return data.data as AISuggestion;
    },
    enabled: !!challengeId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/* ─── Hook: fetch challenge summary ──────────────────────── */

function useChallengeForLC(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-lc-summary', challengeId],
    queryFn: async () => {
      if (!challengeId) throw new Error('No challenge ID');
      const { data, error } = await supabase
        .from('challenges')
        .select('title, problem_statement, scope, description, ip_model, maturity_level, deliverables, current_phase, master_status, governance_profile')
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });
}

/* ─── Main Component ─────────────────────────────────────── */

export default function LcLegalWorkspacePage() {
  // ── Hooks (all at top level) ──
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: roles } = useUserChallengeRoles(user?.id, challengeId);
  const { data: challenge, isLoading: challengeLoading } = useChallengeForLC(challengeId);
  const { data: suggestions, isLoading: suggestionsLoading, error: suggestionsError, refetch: refetchSuggestions } = useLegalSuggestions(challengeId);
  const completePhase = useCompletePhase();

  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [lcNotes, setLcNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Derived state ──
  const isLC = roles?.includes('LC');
  const hasAccess = isLC || roles?.includes('CR') || roles?.includes('RQ');

  // ── Accept doc mutation ──
  const acceptDocMutation = useMutation({
    mutationFn: async (doc: SuggestedDoc) => {
      if (!challengeId || !user?.id) throw new Error('Missing context');

      // Insert into challenge_legal_docs
      const { error } = await supabase.from('challenge_legal_docs').insert({
        challenge_id: challengeId,
        document_type: doc.document_type,
        tier: doc.tier,
        status: 'attached',
        lc_status: 'approved',
        lc_reviewed_by: user.id,
        lc_reviewed_at: new Date().toISOString(),
        lc_review_notes: lcNotes[doc.document_type] || `AI-suggested: ${doc.rationale}`,
        document_name: doc.title,
        maturity_level: challenge?.maturity_level ?? null,
        attached_by: user.id,
        created_by: user.id,
      } as any);

      if (error) throw new Error(error.message);
      return doc.document_type;
    },
    onSuccess: (docType) => {
      setAcceptedDocs(prev => new Set([...prev, docType]));
      toast.success(`${docType} document accepted and attached`);
      queryClient.invalidateQueries({ queryKey: ['legal-suggestions', challengeId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'accept_legal_doc' });
    },
  });

  // ── Submit to curation ──
  const handleSubmitToCuration = async () => {
    if (!challengeId || !user?.id) return;
    setSubmitting(true);
    try {
      // Validate GATE-02 first
      const { data: gateResult } = await supabase.rpc('validate_gate_02', {
        p_challenge_id: challengeId,
      });

      const gate = gateResult as unknown as { passed: boolean; failures: string[] } | null;
      if (!gate?.passed) {
        const failures = gate?.failures ?? ['Unknown validation failure'];
        toast.error(`Cannot advance: ${failures.join(', ')}`);
        return;
      }

      // Complete phase 2 → 3
      await completePhase.mutateAsync({
        challengeId,
        userId: user.id,
      });

      toast.success('Legal review complete — challenge advanced to Curation');
      navigate('/cogni/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Conditional returns (AFTER all hooks) ──
  if (challengeLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
            <p className="text-lg font-semibold">Access Denied</p>
            <p className="text-sm text-muted-foreground mt-1">You need the Legal Coordinator (LC) role to access this workspace.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/cogni/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleCard = (docType: string) => {
    setOpenCards(prev => {
      const next = new Set(prev);
      if (next.has(docType)) next.delete(docType);
      else next.add(docType);
      return next;
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/cogni/dashboard" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Legal Coordinator Workspace
          </h1>
          <p className="text-sm text-muted-foreground">
            Review AI-suggested legal documents for: <span className="font-medium text-foreground">{challenge?.title ?? 'Challenge'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Challenge Summary (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Challenge Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Title:</span>
                <p className="font-medium">{challenge?.title}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Problem:</span>
                <p className="text-foreground/80">{challenge?.problem_statement || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Scope:</span>
                <p className="text-foreground/80">{challenge?.scope || 'Not specified'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {challenge?.maturity_level && (
                  <Badge variant="secondary">{challenge.maturity_level}</Badge>
                )}
                {challenge?.ip_model && (
                  <Badge variant="outline">{challenge.ip_model}</Badge>
                )}
                {challenge?.governance_profile && (
                  <Badge variant="outline">{challenge.governance_profile}</Badge>
                )}
              </div>
              {challenge?.deliverables && (
                <div>
                  <span className="text-muted-foreground">Deliverables:</span>
                  <p className="text-foreground/80 text-xs mt-1">
                    {typeof challenge.deliverables === 'string'
                      ? challenge.deliverables
                      : JSON.stringify(challenge.deliverables)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: AI Suggestions (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* AI Summary Banner */}
          {suggestions && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-3 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">AI Legal Analysis</p>
                  <p className="text-sm text-muted-foreground mt-1">{suggestions.summary}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading state */}
          {suggestionsLoading && (
            <Card>
              <CardContent className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
                <p className="text-sm text-muted-foreground">AI is analyzing the challenge and suggesting legal documents…</p>
              </CardContent>
            </Card>
          )}

          {/* Error state */}
          {suggestionsError && (
            <Card className="border-destructive/30">
              <CardContent className="py-6 text-center">
                <AlertCircle className="h-6 w-6 mx-auto text-destructive mb-2" />
                <p className="text-sm text-destructive">Failed to load AI suggestions</p>
                <p className="text-xs text-muted-foreground mt-1">{suggestionsError.message}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => refetchSuggestions()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Document cards */}
          {suggestions?.documents?.map((doc) => {
            const isAccepted = acceptedDocs.has(doc.document_type);
            const isOpen = openCards.has(doc.document_type);

            return (
              <Collapsible key={doc.document_type} open={isOpen} onOpenChange={() => toggleCard(doc.document_type)}>
                <Card className={isAccepted ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/10' : ''}>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="py-3 flex items-center gap-3 cursor-pointer">
                      {isAccepted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{doc.title}</span>
                          <Badge variant={doc.priority === 'required' ? 'default' : 'secondary'} className="text-[10px]">
                            {doc.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Tier {doc.tier}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{doc.rationale}</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          AI-Suggested Content Summary
                        </p>
                        <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-md whitespace-pre-line">
                          {doc.content_summary}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-muted-foreground block mb-1">
                          LC Review Notes (optional)
                        </label>
                        <Textarea
                          placeholder="Add notes about modifications, special clauses…"
                          value={lcNotes[doc.document_type] ?? ''}
                          onChange={(e) => setLcNotes(prev => ({ ...prev, [doc.document_type]: e.target.value }))}
                          className="text-sm"
                          rows={2}
                          disabled={isAccepted}
                        />
                      </div>

                      {!isAccepted && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptDocMutation.mutate(doc)}
                            disabled={acceptDocMutation.isPending}
                          >
                            {acceptDocMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Accept & Attach
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            <Upload className="h-3 w-3 mr-1" />
                            Upload Custom
                          </Button>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          {/* Submit to Curation */}
          {suggestions && suggestions.documents.length > 0 && (
            <Card>
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {acceptedDocs.size} of {suggestions.documents.length} documents accepted
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accept all required documents before submitting to curation
                  </p>
                </div>
                <Button
                  onClick={handleSubmitToCuration}
                  disabled={submitting || acceptedDocs.size === 0}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Submit to Curation
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
