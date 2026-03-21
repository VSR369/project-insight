/**
 * LcLegalWorkspacePage — AI-assisted Legal Coordinator workspace.
 * Route: /cogni/challenges/:id/lc-legal
 *
 * Full-width layout: read-only challenge details → manual "Generate Legal Docs"
 * → AI-generated document cards with inline editing + file attachment.
 * LC can also delete docs and manually add new documents.
 */

import { useState, useCallback } from 'react';
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
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { sanitizeFileName } from '@/lib/sanitizeFileName';

const IP_MODEL_LABELS: Record<string, string> = {
  'IP-EA': 'Exclusive Assignment — Full IP transfer to seeker',
  'IP-NEL': 'Non-Exclusive License — Solver retains rights, seeker gets license',
  'IP-EL': 'Exclusive License — Seeker gets exclusive usage rights',
  'IP-JO': 'Joint Ownership — Shared IP between solver and seeker',
  'IP-NONE': 'No Transfer — Solver retains all IP rights',
};

const DOCUMENT_TYPES = [
  'NDA',
  'CHALLENGE_TERMS',
  'IP_ASSIGNMENT',
  'SOLUTION_LICENSE',
  'ESCROW_AGREEMENT',
  'DATA_PROTECTION',
  'COLLABORATION_AGREEMENT',
] as const;

const FILE_UPLOAD_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ] as readonly string[],
  allowedExtensions: ['.pdf', '.docx'] as readonly string[],
  label: 'Legal Document',
};

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  ArrowLeft,
  Sparkles,
  FileText,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Shield,
  AlertCircle,
  Send,
  Eye,
  Trash2,
  Plus,
  Save,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────── */

interface SuggestedDoc {
  id: string;
  document_type: string;
  tier: string;
  title: string;
  rationale: string;
  content_summary: string;
  priority: 'required' | 'recommended';
}

interface DocEditState {
  content: string;
  notes: string;
  file: File | null;
}

interface AttachedDoc {
  id: string;
  document_type: string;
  tier: string;
  document_name: string | null;
  status: string | null;
  lc_status: string | null;
  lc_review_notes: string | null;
  attached_by: string | null;
  created_at: string;
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

/* ─── Hook: fetch attached legal docs (non-suggested) ────── */

function useAttachedLegalDocs(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['attached-legal-docs', challengeId],
    queryFn: async () => {
      if (!challengeId) throw new Error('No challenge ID');
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, tier, document_name, status, lc_status, lc_review_notes, attached_by, created_at')
        .eq('challenge_id', challengeId)
        .neq('status', 'ai_suggested')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as AttachedDoc[];
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

/* ─── Hook: fetch persisted AI suggestions from DB ───────── */

function usePersistedSuggestions(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['ai-legal-suggestions', challengeId],
    queryFn: async (): Promise<SuggestedDoc[]> => {
      if (!challengeId) throw new Error('No challenge ID');
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, tier, document_name, status, content_summary, rationale, priority')
        .eq('challenge_id', challengeId)
        .eq('status', 'ai_suggested')
        .order('created_at', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((d: any) => ({
        id: d.id,
        document_type: d.document_type,
        tier: d.tier,
        title: d.document_name ?? d.document_type,
        rationale: d.rationale ?? '',
        content_summary: d.content_summary ?? '',
        priority: d.priority ?? 'recommended',
      }));
    },
    enabled: !!challengeId,
    staleTime: 30_000,
  });
}

/* ─── Helpers ────────────────────────────────────────────── */

function renderJsonList(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (Array.isArray(obj.items)) return renderJsonList(obj.items);
    if (Array.isArray(obj.criteria)) return renderJsonList(obj.criteria);
    if (Array.isArray(obj.types)) return renderJsonList(obj.types);
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
  const { data: attachedDocs, isLoading: attachedLoading } = useAttachedLegalDocs(challengeId);
  const {
    data: aiSuggestions,
    isLoading: suggestionsQueryLoading,
  } = usePersistedSuggestions(challengeId);
  const completePhase = useCompletePhase();

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [openCards, setOpenCards] = useState<Set<string>>(new Set());
  const [docEdits, setDocEdits] = useState<Record<string, DocEditState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [gateFailures, setGateFailures] = useState<string[]>([]);
  const [maturityValue, setMaturityValue] = useState<string>('');
  const [savingContent, setSavingContent] = useState<string | null>(null);

  // ── Add New Doc form state ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('');
  const [newDocTier, setNewDocTier] = useState('TIER_1');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocNotes, setNewDocNotes] = useState('');
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [addingDoc, setAddingDoc] = useState(false);

  // ── Derived state ──
  const isLC = roles?.includes('LC');
  const hasAccess = isLC || roles?.includes('CR') || roles?.includes('RQ');

  // ── Generate handler (calls edge function via mutation) ──
  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-legal-documents', {
        body: { challenge_id: challengeId },
      });
      if (error) throw new Error(error.message ?? 'Failed to get suggestions');
      if (!data?.success) throw new Error(data?.error?.message ?? 'AI suggestion failed');
      // Invalidate the persisted suggestions query to reload from DB
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

  // ── Edit state helpers ──
  const getDocEdit = (docType: string): DocEditState =>
    docEdits[docType] ?? { content: '', notes: '', file: null };

  const updateDocEdit = (docType: string, field: keyof DocEditState, value: string | File | null) => {
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

  // ── Accept doc mutation (UPDATE existing ai_suggested row) ──
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
      } as any).eq('id', doc.id);

      if (error) throw new Error(error.message);

      // Upload file if attached
      if (edit.file && challengeId) {
        const safeName = sanitizeFileName(edit.file.name);
        const path = `${challengeId}/${doc.document_type}/${crypto.randomUUID()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from('legal-docs')
          .upload(path, edit.file);
        if (uploadErr) {
          console.error('File upload failed:', uploadErr.message);
        }
      }

      return doc.document_type;
    },
    onSuccess: (docType) => {
      toast.success(`${docType} document accepted and attached`);
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'accept_legal_doc' });
    },
  });

  // ── Delete doc mutation ──
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
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_legal_doc' });
    },
  });

  // ── Dismiss AI suggestion (delete from DB) ──
  const dismissSuggestionMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from('challenge_legal_docs').delete().eq('id', docId).eq('status', 'ai_suggested');
      if (error) throw new Error(error.message);
      return docId;
    },
    onSuccess: () => {
      toast.success('Suggestion dismissed');
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'dismiss_legal_suggestion' });
    },
  });

  // ── Save content edits without accepting ──
  const handleSaveContent = useCallback(async (doc: SuggestedDoc) => {
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
      } as any).eq('id', doc.id);
      if (error) throw new Error(error.message);
      toast.success(`${doc.document_type} content saved`);
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingContent(null);
    }
  }, [user?.id, docEdits, challengeId, queryClient]);

  // ── Update maturity level on challenge ──
  const handleSetMaturityLevel = useCallback(async (level: string) => {
    if (!challengeId || !user?.id) return;
    try {
      const { error } = await supabase.from('challenges').update({
        maturity_level: level,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', challengeId);
      if (error) throw new Error(error.message);
      toast.success('Maturity level updated');
      setMaturityValue('');
      setGateFailures((prev) => prev.filter((f) => !f.toLowerCase().includes('maturity')));
      queryClient.invalidateQueries({ queryKey: ['challenge-lc-detail', challengeId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    }
  }, [challengeId, user?.id, queryClient]);


  const handleAddNewDoc = async () => {
    if (!challengeId || !user?.id || !newDocTitle || !newDocType) {
      toast.error('Please fill in title and document type');
      return;
    }
    setAddingDoc(true);
    try {
      // Check if a row already exists for this challenge+type+tier (e.g. ai_suggested)
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
      } as any;

      if (existing?.id) {
        // Update existing row (replaces ai_suggested or prior doc)
        const { error } = await supabase.from('challenge_legal_docs').update(payload).eq('id', existing.id);
        if (error) throw new Error(error.message);
      } else {
        // Insert new row
        const { error } = await supabase.from('challenge_legal_docs').insert({
          challenge_id: challengeId,
          document_type: newDocType,
          tier: newDocTier,
          created_by: user.id,
          ...payload,
        } as any);
        if (error) throw new Error(error.message);
      }

      // Upload file if provided
      if (newDocFile) {
        const safeName = sanitizeFileName(newDocFile.name);
        const path = `${challengeId}/${newDocType}/${crypto.randomUUID()}_${safeName}`;
        const { error: uploadErr } = await supabase.storage
          .from('legal-docs')
          .upload(path, newDocFile);
        if (uploadErr) {
          console.error('File upload failed:', uploadErr.message);
        }
      }

      toast.success('Legal document added successfully');
      queryClient.invalidateQueries({ queryKey: ['attached-legal-docs', challengeId] });
      queryClient.invalidateQueries({ queryKey: ['ai-legal-suggestions', challengeId] });

      // Reset form
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

  // ── Submit to curation ──
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

      // Direct phase update — bypasses complete_phase RPC permission issues
      const { error } = await supabase.from('challenges').update({
        current_phase: 3,
        phase_status: 'ACTIVE',
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', challengeId);

      if (error) throw new Error(error.message);

      // Invalidate dashboard queries so curator sees the challenge
      queryClient.invalidateQueries({ queryKey: ['cogni-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-waiting-for'] });
      queryClient.invalidateQueries({ queryKey: ['cogni-open-challenges'] });

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

  // AI suggestions are now loaded from DB — no local filtering needed
  const visibleSuggestions = aiSuggestions ?? [];
  const hasSuggestions = visibleSuggestions.length > 0;
  const totalAccepted = attachedDocs?.length ?? 0;

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
                  try {
                    if (sessionStorage.getItem('cogni_demo_path') === 'ai') return null;
                  } catch { /* SSR-safe */ }
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
      {/* SECTION 2: Attached Legal Documents                    */}
      {/* ════════════════════════════════════════════════════════ */}
      {!attachedLoading && attachedDocs && attachedDocs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Attached Legal Documents ({attachedDocs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attachedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="border rounded-lg p-3 flex items-center gap-3 bg-muted/30"
                >
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{doc.document_name ?? doc.document_type}</span>
                      <Badge variant="outline" className="text-[10px]">Tier {doc.tier}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{doc.document_type}</Badge>
                      {doc.lc_status && (
                        <Badge
                          variant={doc.lc_status === 'approved' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {doc.lc_status}
                        </Badge>
                      )}
                    </div>
                    {doc.lc_review_notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{doc.lc_review_notes}</p>
                    )}
                  </div>
                  {doc.attached_by === user?.id && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:text-destructive"
                          disabled={deleteDocMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Legal Document</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{doc.document_name ?? doc.document_type}"?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDocMutation.mutate(doc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 4: Generate Legal Documents                    */}
      {/* ════════════════════════════════════════════════════════ */}
      {isLC && !generating && !suggestionsQueryLoading && !hasSuggestions && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="py-8 text-center space-y-3">
            <Sparkles className="h-8 w-8 mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {totalAccepted > 0 ? 'Generate Additional Legal Documents' : 'Ready to Generate Legal Documents'}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              AI will analyze the challenge specification above — maturity level, IP model, governance
              profile — and generate complete legal documents with full clauses ready for review.
            </p>
            <Button onClick={handleGenerate} disabled={generating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Legal Documents
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {generating && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">AI is generating comprehensive legal documents…</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {generateError && (
        <Card className="border-destructive/30">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-destructive mb-2" />
            <p className="text-sm text-destructive">Failed to generate AI suggestions</p>
            <p className="text-xs text-muted-foreground mt-1">{generateError}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleGenerate}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* SECTION 5: AI Suggestion Document Cards                 */}
      {/* ════════════════════════════════════════════════════════ */}
      {hasSuggestions && (
        <div className="space-y-4">
          {/* AI Summary Banner */}
          {/* AI Summary Banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-3 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">AI Legal Analysis</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {visibleSuggestions.length} document{visibleSuggestions.length !== 1 ? 's' : ''} recommended for this challenge.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Document cards */}
          {visibleSuggestions && visibleSuggestions.length > 0 ? (
            visibleSuggestions.map((doc) => {
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
                  <Card>
                    <CollapsibleTrigger className="w-full">
                      <CardContent className="py-3 flex items-center gap-3 cursor-pointer">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
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
                            className="text-sm min-h-[300px] font-mono"
                            placeholder="AI-generated legal document — edit as needed…"
                          />
                        </div>

                        {/* File upload */}
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                            Upload Document (optional)
                          </label>
                          <FileUploadZone
                            config={FILE_UPLOAD_CONFIG}
                            value={edit.file}
                            onChange={(file) => updateDocEdit(doc.document_type, 'file', file)}
                          />
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
                          />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveContent(doc)}
                            disabled={savingContent === doc.document_type}
                          >
                            {savingContent === doc.document_type ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Save Edits
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => dismissSuggestionMutation.mutate(doc.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          ) : (
            visibleSuggestions.length === 0 && (
              <Card>
                <CardContent className="py-4 text-center text-sm text-muted-foreground">
                  All suggested documents have been processed.
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* Add New Legal Document (Collapsible) — always visible   */}
      {/* ════════════════════════════════════════════════════════ */}
      {isLC && (
        <Collapsible open={showAddForm} onOpenChange={setShowAddForm}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <Plus className="h-4 w-4 mr-2" />
              Add Legal Document Manually
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showAddForm ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Document Title *
                    </label>
                    <Input
                      placeholder="e.g., Non-Disclosure Agreement"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                      Document Type *
                    </label>
                    <Select value={newDocType} onValueChange={setNewDocType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t.replace(/_/g, ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    Tier
                  </label>
                  <Select value={newDocTier} onValueChange={setNewDocTier}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIER_1">Tier 1 — Entry/Participation</SelectItem>
                      <SelectItem value="TIER_2">Tier 2 — Solution/Award</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    Document Content
                  </label>
                  <Textarea
                    placeholder="Paste or write the full legal document content here…"
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    className="text-sm min-h-[160px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    Upload Document (optional)
                  </label>
                  <FileUploadZone
                    config={FILE_UPLOAD_CONFIG}
                    value={newDocFile}
                    onChange={setNewDocFile}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
                    LC Notes (optional)
                  </label>
                  <Textarea
                    placeholder="Add notes about this document…"
                    value={newDocNotes}
                    onChange={(e) => setNewDocNotes(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddNewDoc} disabled={addingDoc || !newDocTitle || !newDocType}>
                    {addingDoc ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Add Document
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}

      <Separator />

      {/* ════════════════════════════════════════════════════════ */}
      {/* Submit to Curation                                       */}
      {/* ════════════════════════════════════════════════════════ */}

      {/* GATE-02 Failure Banners */}
      {gateFailures.length > 0 && (
        <div className="space-y-3">
          {gateFailures.map((failure, idx) => {
            const isMaturity = failure.toLowerCase().includes('maturity');
            const isPendingDocs = failure.toLowerCase().includes('pending');
            return (
              <Alert key={idx} variant="destructive" className="border-destructive/30">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">Validation Failed</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p className="text-sm">{failure}</p>
                  {isMaturity && (
                    <div className="flex items-center gap-2 mt-2">
                      <Select value={maturityValue} onValueChange={setMaturityValue}>
                        <SelectTrigger className="w-48 h-8 text-xs">
                          <SelectValue placeholder="Set maturity level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IDEATION">Ideation</SelectItem>
                          <SelectItem value="CONCEPT">Concept</SelectItem>
                          <SelectItem value="PROTOTYPE">Prototype</SelectItem>
                          <SelectItem value="VALIDATED">Validated</SelectItem>
                          <SelectItem value="SCALING">Scaling</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!maturityValue}
                        onClick={() => handleSetMaturityLevel(maturityValue)}
                      >
                        Fix
                      </Button>
                    </div>
                  )}
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

      {/* Pending suggestions warning */}
      {hasSuggestions && (
        <Alert className="border-destructive/20 bg-muted/30">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            <strong>{visibleSuggestions.length}</strong> AI-suggested document{visibleSuggestions.length !== 1 ? 's' : ''} pending review.
            Accept or Dismiss all before submitting to curation.
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
          <Button
            onClick={handleSubmitToCuration}
            disabled={submitting || totalAccepted === 0 || challenge?.current_phase !== 2}
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
  );
}
