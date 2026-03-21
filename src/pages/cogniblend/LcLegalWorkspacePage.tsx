/**
 * LcLegalWorkspacePage — AI-assisted Legal Coordinator workspace.
 * Route: /cogni/challenges/:id/lc-legal
 *
 * Full-width layout: read-only challenge details → manual "Generate Legal Docs"
 * → AI-generated document cards with inline editing + file/link attachment.
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { useCompletePhase } from '@/hooks/cogniblend/useCompletePhase';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { WorkflowProgressBanner } from '@/components/cogniblend/WorkflowProgressBanner';
import { resolveGovernanceMode, GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';
import { getMaturityLabel } from '@/lib/maturityLabels';

const IP_MODEL_LABELS: Record<string, string> = {
  'IP-EA': 'Exclusive Assignment — Full IP transfer to seeker',
  'IP-NEL': 'Non-Exclusive License — Solver retains rights, seeker gets license',
  'IP-EL': 'Exclusive License — Seeker gets exclusive usage rights',
  'IP-JO': 'Joint Ownership — Shared IP between solver and seeker',
  'IP-NONE': 'No Transfer — Solver retains all IP rights',
};

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
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
  Link as LinkIcon,
  Eye,
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

interface DocEditState {
  content: string;
  linkUrl: string;
  notes: string;
}

/* ─── Hook: fetch challenge (expanded fields) ────────────── */

function useChallengeForLC(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['challenge-lc-detail', challengeId],
    queryFn: async () => {
      if (!challengeId) throw new Error('No challenge ID');
      const { data, error } = await supabase
        .from('challenges')
        .select(
          'title, problem_statement, scope, description, ip_model, maturity_level, deliverables, current_phase, master_status, governance_profile, evaluation_criteria, eligibility, solver_eligibility_types, hook, reward_structure, operating_model, solver_visibility_types'
        )
        .eq('id', challengeId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });
}

/* ─── Hook: manual AI suggestion trigger ─────────────────── */

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
    enabled: false, // manual trigger only
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/* ─── Helpers ────────────────────────────────────────────── */

function renderJsonList(val: unknown): string[] {
  if (!val) return [];
  // Unwrap known container shapes: {items:[...]}, {criteria:[...]}, {types:[...]}
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.items)) return renderJsonList(obj.items);
    if (Array.isArray(obj.criteria)) return renderJsonList(obj.criteria);
    if (Array.isArray(obj.types)) return renderJsonList(obj.types);
    // Single-key wrapper: unwrap first array-valued key
    const keys = Object.keys(obj);
    for (const k of keys) {
      if (Array.isArray(obj[k])) return renderJsonList(obj[k]);
    }
  }
  if (Array.isArray(val)) {
    return val.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        return (item as Record<string, unknown>).label as string
          ?? (item as Record<string, unknown>).name as string
          ?? (item as Record<string, unknown>).description as string
          ?? (item as Record<string, unknown>).title as string
          ?? (item as Record<string, unknown>).type as string
          ?? JSON.stringify(item);
      }
      return String(item);
    });
  }
  if (typeof val === 'string') return [val];
  return [JSON.stringify(val)];
}

function renderEvalCriteria(val: unknown): { name: string; weight: number; description?: string }[] {
  if (!val) return [];
  // Unwrap {criteria:[...]} wrapper
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.criteria)) return renderEvalCriteria(obj.criteria);
    if (Array.isArray(obj.items)) return renderEvalCriteria(obj.items);
  }
  if (!Array.isArray(val)) return [];
  return val.map((item: any) => ({
    name: item.name ?? item.criterion ?? '',
    weight: item.weight ?? item.percentage ?? 0,
    description: item.description ?? '',
  }));
}

/** Parse reward_structure JSONB into display-friendly shape */
function parseRewardStructure(val: unknown): {
  currency?: string;
  paymentMode?: string;
  numRewarded?: number;
  milestones?: { name: string; trigger: string; percentage: number }[];
  tiers?: { label: string; amount: number }[];
  totalPool?: number;
} | null {
  if (!val || typeof val !== 'object') return null;
  const obj = val as Record<string, unknown>;
  return {
    currency: (obj.currency ?? obj.currency_code) as string | undefined,
    paymentMode: (obj.payment_mode ?? obj.paymentMode) as string | undefined,
    numRewarded: (obj.num_rewarded ?? obj.numRewarded) as number | undefined,
    milestones: Array.isArray(obj.payment_milestones) ? obj.payment_milestones as any[] : undefined,
    tiers: Array.isArray(obj.tiers) ? obj.tiers as any[] : undefined,
    totalPool: (obj.total_pool ?? obj.totalPool) as number | undefined,
  };
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
  const {
    data: suggestions,
    isFetching: suggestionsLoading,
    error: suggestionsError,
    refetch: refetchSuggestions,
  } = useLegalSuggestions(challengeId);
  const completePhase = useCompletePhase();

  const [hasGenerated, setHasGenerated] = useState(false);
  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [docEdits, setDocEdits] = useState<Record<string, DocEditState>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Derived state ──
  const isLC = roles?.includes('LC');
  const hasAccess = isLC || roles?.includes('CR') || roles?.includes('RQ');

  // ── Generate handler ──
  const handleGenerate = async () => {
    setHasGenerated(true);
    await refetchSuggestions();
  };

  // ── Edit state helpers ──
  const getDocEdit = (docType: string): DocEditState =>
    docEdits[docType] ?? { content: '', linkUrl: '', notes: '' };

  const updateDocEdit = (docType: string, field: keyof DocEditState, value: string) => {
    setDocEdits((prev) => ({
      ...prev,
      [docType]: { ...getDocEdit(docType), [field]: value },
    }));
  };

  // ── Initialize edit content from AI suggestion ──
  const initDocContent = (doc: SuggestedDoc) => {
    if (!docEdits[doc.document_type]?.content) {
      setDocEdits((prev) => ({
        ...prev,
        [doc.document_type]: {
          ...getDocEdit(doc.document_type),
          content: doc.content_summary,
        },
      }));
    }
  };

  // ── Accept doc mutation ──
  const acceptDocMutation = useMutation({
    mutationFn: async (doc: SuggestedDoc) => {
      if (!challengeId || !user?.id) throw new Error('Missing context');
      const edit = getDocEdit(doc.document_type);

      const { error } = await supabase.from('challenge_legal_docs').insert({
        challenge_id: challengeId,
        document_type: doc.document_type,
        tier: doc.tier,
        status: 'attached',
        lc_status: 'approved',
        lc_reviewed_by: user.id,
        lc_reviewed_at: new Date().toISOString(),
        lc_review_notes: edit.notes || `AI-suggested: ${doc.rationale}`,
        document_name: doc.title,
        maturity_level: challenge?.maturity_level ?? null,
        attached_by: user.id,
        created_by: user.id,
      } as any);

      if (error) throw new Error(error.message);
      return doc.document_type;
    },
    onSuccess: (docType) => {
      setAcceptedDocs((prev) => new Set([...prev, docType]));
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
      const { data: gateResult } = await supabase.rpc('validate_gate_02', {
        p_challenge_id: challengeId,
      });

      const gate = gateResult as unknown as { passed: boolean; failures: string[] } | null;
      if (!gate?.passed) {
        const failures = gate?.failures ?? ['Unknown validation failure'];
        toast.error(`Cannot advance: ${failures.join(', ')}`);
        return;
      }

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

  // ── Toggle card ──
  const toggleCard = (docType: string) => {
    setOpenCards((prev) => {
      const next = new Set(prev);
      if (next.has(docType)) next.delete(docType);
      else next.add(docType);
      return next;
    });
  };

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

  const deliverablesList = renderJsonList(challenge?.deliverables);
  const evalCriteria = renderEvalCriteria(challenge?.evaluation_criteria);
  const solverTypes = renderJsonList(challenge?.solver_eligibility_types);
  const solverVisible = renderJsonList(challenge?.solver_visibility_types);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link to="/cogni/lc-queue" className="text-muted-foreground hover:text-foreground">
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

      {/* ── Workflow Banner ── */}
      <WorkflowProgressBanner step={3} />

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 1: Read-Only Challenge Details                  */}
      {/* ════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Challenge Specification — Read Only
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['overview', 'deliverables', 'evaluation', 'ip', 'solver']}>
            {/* Overview */}
            <AccordionItem value="overview">
              <AccordionTrigger className="text-sm font-semibold">Overview</AccordionTrigger>
              <AccordionContent className="space-y-4">
                {challenge?.hook && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Hook</p>
                    <p className="text-sm text-foreground">{challenge.hook}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Problem Statement</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{challenge?.problem_statement || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Scope & Constraints</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{challenge?.scope || '—'}</p>
                </div>
                {challenge?.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                    <p className="text-sm text-foreground whitespace-pre-line">{challenge.description}</p>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Deliverables */}
            <AccordionItem value="deliverables">
              <AccordionTrigger className="text-sm font-semibold">Deliverables</AccordionTrigger>
              <AccordionContent>
                {deliverablesList.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground">
                    {deliverablesList.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">No deliverables specified.</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Evaluation Criteria */}
            <AccordionItem value="evaluation">
              <AccordionTrigger className="text-sm font-semibold">Evaluation Criteria</AccordionTrigger>
              <AccordionContent>
                {evalCriteria.length > 0 ? (
                  <div className="relative w-full overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Criterion</th>
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Weight</th>
                          <th className="text-left py-2 font-medium text-muted-foreground">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalCriteria.map((c, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-4 font-medium">{c.name}</td>
                            <td className="py-2 pr-4 tabular-nums">{c.weight}%</td>
                            <td className="py-2 text-muted-foreground">{c.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No evaluation criteria specified.</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* IP & Governance */}
            <AccordionItem value="ip">
              <AccordionTrigger className="text-sm font-semibold">IP Model & Governance</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {challenge?.ip_model && (
                    <Badge variant="outline">IP: {IP_MODEL_LABELS[challenge.ip_model] ?? challenge.ip_model}</Badge>
                  )}
                  {(() => {
                    const mode = resolveGovernanceMode(challenge?.governance_profile);
                    const cfg = GOVERNANCE_MODE_CONFIG[mode];
                    return (
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        Governance: {cfg.label}
                      </span>
                    );
                  })()}
                  <Badge variant="secondary">Maturity: {getMaturityLabel(challenge?.maturity_level)}</Badge>
                  {challenge?.operating_model && <Badge variant="secondary">Model: {challenge.operating_model}</Badge>}
                  {challenge?.current_phase != null && <Badge variant="outline">Phase: {challenge.current_phase}</Badge>}
                  {challenge?.master_status && <Badge variant="outline">Status: {challenge.master_status}</Badge>}
                </div>
                {(() => {
                  const reward = parseRewardStructure(challenge?.reward_structure);
                  if (!reward) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reward Structure</p>
                      <div className="flex flex-wrap gap-2">
                        {reward.currency && <Badge variant="outline">Currency: {reward.currency}</Badge>}
                        {reward.paymentMode && <Badge variant="secondary">{reward.paymentMode.replace(/_/g, ' ')}</Badge>}
                        {reward.numRewarded != null && <Badge variant="secondary">{reward.numRewarded} awarded</Badge>}
                        {reward.totalPool != null && <Badge variant="outline">Pool: {reward.totalPool.toLocaleString()}</Badge>}
                      </div>
                      {reward.tiers && reward.tiers.length > 0 && (
                        <div className="relative w-full overflow-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Tier</th>
                                <th className="text-left py-2 font-medium text-muted-foreground">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reward.tiers.map((t: any, i: number) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-2 pr-4 font-medium">{t.label ?? t.name ?? `Tier ${i + 1}`}</td>
                                  <td className="py-2 tabular-nums">{(t.amount ?? t.value ?? 0).toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {reward.milestones && reward.milestones.length > 0 && (
                        <div className="relative w-full overflow-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Milestone</th>
                                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Trigger</th>
                                <th className="text-left py-2 font-medium text-muted-foreground">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reward.milestones.map((m: any, i: number) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-2 pr-4 font-medium">{m.name ?? m.label ?? `Milestone ${i + 1}`}</td>
                                  <td className="py-2 pr-4 text-muted-foreground">{(m.trigger ?? '').replace(/_/g, ' ')}</td>
                                  <td className="py-2 tabular-nums">{m.pct ?? m.percentage ?? m.percent ?? 0}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </AccordionContent>
            </AccordionItem>

            {/* Solver Eligibility */}
            <AccordionItem value="solver">
              <AccordionTrigger className="text-sm font-semibold">Solver Eligibility & Visibility</AccordionTrigger>
              <AccordionContent className="space-y-3">
                {challenge?.eligibility && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Eligibility</p>
                    <p className="text-sm text-foreground">{challenge.eligibility}</p>
                  </div>
                )}
                {solverTypes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Eligible Solver Types</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {solverTypes.map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {solverVisible.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Visible Solver Types</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {solverVisible.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Separator />

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 2: Generate Legal Documents                    */}
      {/* ════════════════════════════════════════════════════════ */}
      {!suggestions && !suggestionsLoading && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="py-8 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Ready to Generate Legal Documents
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              AI will analyze the challenge specification above — maturity level, IP model, governance
              profile — and suggest which legal documents are needed with draft content for each.
            </p>
            <Button onClick={handleGenerate} disabled={suggestionsLoading}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Legal Documents
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {suggestionsLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">AI is analyzing the challenge and suggesting legal documents…</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {suggestionsError && hasGenerated && (
        <Card className="border-destructive/30">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">Failed to load AI suggestions</p>
            <p className="text-xs text-muted-foreground mt-1">{suggestionsError.message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 3: AI Summary + Document Cards                 */}
      {/* ════════════════════════════════════════════════════════ */}
      {suggestions && (
        <div className="space-y-4">
          {/* AI Summary Banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">AI Legal Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">{suggestions.summary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Document cards */}
          {suggestions.documents.map((doc) => {
            const isAccepted = acceptedDocs.has(doc.document_type);
            const isOpen = openCards.has(doc.document_type);
            const edit = getDocEdit(doc.document_type);

            return (
              <Collapsible
                key={doc.document_type}
                open={isOpen}
                onOpenChange={() => {
                  toggleCard(doc.document_type);
                  initDocContent(doc);
                }}
              >
                <Card className={isAccepted ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/10' : ''}>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="py-3 flex items-center gap-3 cursor-pointer">
                      {isAccepted ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
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
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-4 border-t pt-3">
                      {/* Inline editable content */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                          Document Content
                        </label>
                        <Textarea
                          value={edit.content || doc.content_summary}
                          onChange={(e) => updateDocEdit(doc.document_type, 'content', e.target.value)}
                          className="text-sm min-h-[120px]"
                          disabled={isAccepted}
                          placeholder="AI-generated content — edit as needed…"
                        />
                      </div>

                      {/* External link */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                          External Link (optional)
                        </label>
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <Input
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={edit.linkUrl}
                            onChange={(e) => updateDocEdit(doc.document_type, 'linkUrl', e.target.value)}
                            disabled={isAccepted}
                            className="text-sm"
                          />
                        </div>
                      </div>

                      {/* File upload placeholder */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                          Upload File (optional)
                        </label>
                        <Button variant="outline" size="sm" disabled={isAccepted}>
                          <Upload className="h-3 w-3 mr-1" />
                          Upload Document
                        </Button>
                      </div>

                      {/* LC Notes */}
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                          LC Review Notes
                        </label>
                        <Textarea
                          placeholder="Add notes about modifications, special clauses…"
                          value={edit.notes}
                          onChange={(e) => updateDocEdit(doc.document_type, 'notes', e.target.value)}
                          className="text-sm"
                          rows={2}
                          disabled={isAccepted}
                        />
                      </div>

                      {/* Actions */}
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
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}

          <Separator />

          {/* Submit to Curation */}
          <Card>
            <CardContent className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {acceptedDocs.size} of {suggestions.documents.length} documents accepted
                </p>
                <p className="text-xs text-muted-foreground">
                  Accept all required documents before submitting to curation.
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
        </div>
      )}
    </div>
  );
}
