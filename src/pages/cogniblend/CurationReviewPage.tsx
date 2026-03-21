/**
 * Curation Review Page — /cogni/curation/:id
 *
 * Two-panel layout with:
 *  - LEFT: Accordion sections with inline editing, AI review, section approve checkboxes
 *  - RIGHT: Collapsible 15-point checklist + AI quality panel
 */

import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HoldResumeActions } from "@/components/cogniblend/HoldResumeActions";
import { useUserChallengeRoles } from "@/hooks/cogniblend/useUserChallengeRoles";
import { Badge } from "@/components/ui/badge";
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeHtmlRenderer } from "@/components/ui/SafeHtmlRenderer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Pencil,
  Lock,
  Bot,
  Loader2,
  CheckCheck,
} from "lucide-react";
import CurationChecklistPanel from "./CurationChecklistPanel";
import { AICurationQualityPanel } from "@/components/cogniblend/curation/AICurationQualityPanel";
import PaymentScheduleSection from "@/components/cogniblend/PaymentScheduleSection";
import { TextSectionEditor, DeliverablesEditor, EvalCriteriaEditor } from "@/components/cogniblend/curation/CurationSectionEditor";
import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import type { Json } from "@/integrations/supabase/types";
import { CACHE_STANDARD } from "@/config/queryCache";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChallengeData {
  id: string;
  title: string;
  problem_statement: string | null;
  scope: string | null;
  deliverables: Json | null;
  evaluation_criteria: Json | null;
  reward_structure: Json | null;
  phase_schedule: Json | null;
  complexity_score: number | null;
  complexity_level: string | null;
  complexity_parameters: Json | null;
  ip_model: string | null;
  maturity_level: string | null;
  visibility: string | null;
  eligibility: string | null;
  description: string | null;
  operating_model: string | null;
  governance_profile: string | null;
  current_phase: number | null;
  phase_status: string | null;
}

interface LegalDocSummary {
  tier: string;
  total: number;
  attached: number;
}

interface LegalDocDetail {
  id: string;
  document_type: string;
  document_name: string | null;
  content_summary: string | null;
  lc_status: string | null;
  status: string | null;
  tier: string;
}

interface EscrowRecord {
  id: string;
  escrow_status: string;
  deposit_amount: number;
  remaining_amount: number;
  bank_name: string | null;
  bank_branch: string | null;
  bank_address: string | null;
  currency: string | null;
  deposit_date: string | null;
  deposit_reference: string | null;
  fc_notes: string | null;
}

interface ComplexityParam {
  name?: string;
  key?: string;
  value?: string | number;
  score?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson<T>(val: Json | null): T | null {
  if (!val) return null;
  if (typeof val === "string") {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  return val as T;
}

function LcStatusBadge({ status }: { status: string | null }) {
  if (status === "approved")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] hover:bg-emerald-100">
        <ShieldCheck className="h-3 w-3 mr-1" />Approved
      </Badge>
    );
  if (status === "rejected")
    return <Badge variant="destructive" className="text-[10px]">Rejected</Badge>;
  return <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>;
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

// Keys of sections that are NOT editable by curator
const LOCKED_SECTIONS = new Set(["legal_docs", "escrow_funding"]);

// Keys that use text editor
const TEXT_SECTIONS = new Set(["problem_statement", "scope", "submission_guidelines", "ip_model", "visibility_eligibility"]);

interface SectionDef {
  key: string;
  label: string;
  attribution?: string;
  dbField?: string; // column name in challenges table for save
  isFilled: (ch: ChallengeData, legalDocs: LegalDocSummary[], legalDetails: LegalDocDetail[], escrow: EscrowRecord | null) => boolean;
  render: (ch: ChallengeData, legalDocs: LegalDocSummary[], legalDetails: LegalDocDetail[], escrow: EscrowRecord | null) => React.ReactNode;
}

const SECTIONS: SectionDef[] = [
  {
    key: "problem_statement",
    label: "Problem Statement",
    attribution: "by Creator",
    dbField: "problem_statement",
    isFilled: (ch) => !!ch.problem_statement?.trim(),
    render: (ch) => <SafeHtmlRenderer html={ch.problem_statement} />,
  },
  {
    key: "scope",
    label: "Scope",
    attribution: "by Creator",
    dbField: "scope",
    isFilled: (ch) => !!ch.scope?.trim(),
    render: (ch) => <SafeHtmlRenderer html={ch.scope} />,
  },
  {
    key: "deliverables",
    label: "Deliverables",
    attribution: "by Creator",
    dbField: "deliverables",
    isFilled: (ch) => {
      const raw = parseJson<any>(ch.deliverables);
      const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
      return !!d && d.length > 0;
    },
    render: (ch) => {
      const raw = parseJson<any>(ch.deliverables);
      const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
      if (!d || d.length === 0) return <p className="text-sm text-muted-foreground">None defined.</p>;
      return (
        <ol className="list-decimal list-inside space-y-1">
          {d.map((item: any, i: number) => (
            <li key={i} className="text-sm text-foreground">{typeof item === "string" ? item : item?.name ?? JSON.stringify(item)}</li>
          ))}
        </ol>
      );
    },
  },
  {
    key: "evaluation_criteria",
    label: "Evaluation Criteria",
    attribution: "by Creator",
    dbField: "evaluation_criteria",
    isFilled: (ch) => {
      const raw = parseJson<any>(ch.evaluation_criteria);
      const ec = Array.isArray(raw) ? raw : Array.isArray(raw?.criteria) ? raw.criteria : null;
      return !!ec && ec.length > 0;
    },
    render: (ch) => {
      const raw = parseJson<any>(ch.evaluation_criteria);
      const ec = Array.isArray(raw) ? raw : Array.isArray(raw?.criteria) ? raw.criteria : null;
      if (!ec || ec.length === 0) return <p className="text-sm text-muted-foreground">Not defined.</p>;
      return (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criterion</TableHead>
                <TableHead className="w-24 text-right">Weight %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ec.map((c: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{c.criterion_name ?? c.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{c.weight_percentage ?? c.weight ?? "—"}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    },
  },
  {
    key: "reward_structure",
    label: "Reward Structure",
    attribution: "by Creator",
    dbField: "reward_structure",
    isFilled: (ch) => {
      const raw = parseJson<any>(ch.reward_structure);
      return raw != null && (Array.isArray(raw) ? raw.length > 0 : typeof raw === "object" && Object.keys(raw).length > 0);
    },
    render: (ch) => {
      const raw = parseJson<any>(ch.reward_structure);
      if (!raw) return <p className="text-sm text-muted-foreground">Not defined.</p>;
      if (Array.isArray(raw)) {
        return (
          <div className="space-y-2">
            {raw.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                <span className="text-sm font-medium text-foreground">{r.tier ?? r.label ?? `Tier ${i + 1}`}</span>
                <span className="text-sm text-muted-foreground">${(r.amount ?? r.value ?? 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        );
      }
      const { payment_milestones, ...meta } = raw as Record<string, any>;
      const milestones = Array.isArray(payment_milestones) ? payment_milestones : null;
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(meta).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                <p className="text-sm font-medium text-foreground">{String(v)}</p>
              </div>
            ))}
          </div>
          {milestones && milestones.length > 0 && (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Milestone</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {milestones.map((m: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{m.label ?? m.name ?? `Milestone ${i + 1}`}</TableCell>
                      <TableCell className="text-sm text-right">{m.amount ?? m.value ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "phase_schedule",
    label: "Phase Schedule",
    attribution: "by Creator",
    dbField: "phase_schedule",
    isFilled: (ch) => {
      const raw = parseJson<any>(ch.phase_schedule);
      return raw != null && (Array.isArray(raw) ? raw.length > 0 : typeof raw === "object" && Object.keys(raw).length > 0);
    },
    render: (ch) => {
      const raw = parseJson<any>(ch.phase_schedule);
      if (!raw) return <p className="text-sm text-muted-foreground">Not defined.</p>;
      if (Array.isArray(raw)) {
        return (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Phase</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Duration (days)</TableHead></TableRow></TableHeader>
              <TableBody>
                {raw.map((p: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{p.phase ?? p.phase_number ?? i + 1}</TableCell>
                    <TableCell className="text-sm">{p.label ?? p.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-right">{p.duration_days ?? p.days ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      }
      const { phase_durations, ...meta } = raw as Record<string, any>;
      const durations = Array.isArray(phase_durations) ? phase_durations : null;
      const metaEntries = Object.entries(meta).filter(([, v]) => v != null && v !== "");
      if (!durations?.length && metaEntries.length === 0)
        return <p className="text-sm text-muted-foreground">Not defined.</p>;
      return (
        <div className="space-y-3">
          {metaEntries.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {metaEntries.map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                  <p className="text-sm font-medium text-foreground">{String(v)}</p>
                </div>
              ))}
            </div>
          )}
          {durations && durations.length > 0 && (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Phase</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Duration (days)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {durations.map((p: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{p.phase ?? p.phase_number ?? i + 1}</TableCell>
                      <TableCell className="text-sm">{p.label ?? p.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-right">{p.duration_days ?? p.days ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "complexity",
    label: "Complexity Assessment",
    isFilled: (ch) => ch.complexity_score != null || !!ch.complexity_level,
    render: (ch) => {
      const rawParams = parseJson<any>(ch.complexity_parameters);
      const params = Array.isArray(rawParams) ? rawParams as ComplexityParam[] : null;
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {ch.complexity_score != null && (
              <span className="text-sm text-foreground">Score: <span className="font-semibold">{ch.complexity_score}</span></span>
            )}
            {ch.complexity_level && <Badge variant="secondary" className="text-xs capitalize">{ch.complexity_level}</Badge>}
          </div>
          {params && params.length > 0 && (
            <div className="space-y-1">
              {params.map((p, i) => (
                <div key={i} className="flex justify-between text-xs text-muted-foreground">
                  <span>{p.name ?? p.key ?? `Param ${i + 1}`}</span>
                  <span className="font-medium text-foreground">{p.value ?? p.score ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
          {!ch.complexity_score && !ch.complexity_level && (
            <p className="text-sm text-muted-foreground">Not assessed.</p>
          )}
        </div>
      );
    },
  },
  {
    key: "ip_model",
    label: "IP Model",
    attribution: "by Creator",
    dbField: "ip_model",
    isFilled: (ch) => !!ch.ip_model?.trim(),
    render: (ch) => <p className="text-sm font-medium text-foreground">{ch.ip_model || "—"}</p>,
  },
  {
    key: "domain_tags",
    label: "Domain Tags",
    isFilled: () => false,
    render: () => <p className="text-sm text-muted-foreground italic">Domain tags will be loaded from challenge taxonomy mappings.</p>,
  },
  {
    key: "submission_guidelines",
    label: "Submission Guidelines",
    attribution: "by Creator",
    dbField: "description",
    isFilled: (ch) => !!ch.description?.trim(),
    render: (ch) => <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{ch.description || "—"}</p>,
  },
  {
    key: "legal_docs",
    label: "Legal Documents",
    attribution: "by LC",
    isFilled: (_ch, legalDocs) => legalDocs.length > 0 && legalDocs.every((d) => d.attached === d.total),
    render: (_ch, _legalDocs, legalDetails) => {
      if (!legalDetails || legalDetails.length === 0) return <p className="text-sm text-muted-foreground">No legal documents found.</p>;
      return (
        <div className="space-y-3">
          {legalDetails.map((doc) => (
            <div key={doc.id} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{doc.document_name || doc.document_type}</span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{doc.tier.replace("_", " ")}</Badge>
                </div>
                <LcStatusBadge status={doc.lc_status} />
              </div>
              {doc.content_summary && (
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">{doc.content_summary}</p>
              )}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "escrow_funding",
    label: "Escrow & Funding",
    attribution: "by FC",
    isFilled: (_ch, _ld, _ldd, escrow) => escrow?.escrow_status === "FUNDED",
    render: (_ch, _ld, _ldd, escrow) => {
      if (!escrow) return (
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">No escrow record found. Finance Coordinator has not yet set up funding.</p>
        </div>
      );
      const isFunded = escrow.escrow_status === "FUNDED";
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isFunded ? (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs hover:bg-emerald-100">
                <ShieldCheck className="h-3 w-3 mr-1" />FUNDED
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-amber-700 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />{escrow.escrow_status || "PENDING"}
              </Badge>
            )}
          </div>
          {isFunded && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><p className="text-xs text-muted-foreground">Deposit Amount</p><p className="font-medium text-foreground">{escrow.currency ?? "$"} {escrow.deposit_amount.toLocaleString()}</p></div>
              {escrow.bank_name && <div><p className="text-xs text-muted-foreground">Bank</p><p className="font-medium text-foreground">{escrow.bank_name}</p></div>}
              {escrow.bank_branch && <div><p className="text-xs text-muted-foreground">Branch</p><p className="text-foreground">{escrow.bank_branch}</p></div>}
              {escrow.deposit_date && <div><p className="text-xs text-muted-foreground">Deposit Date</p><p className="text-foreground">{new Date(escrow.deposit_date).toLocaleDateString()}</p></div>}
              {escrow.deposit_reference && <div className="col-span-2"><p className="text-xs text-muted-foreground">Reference</p><p className="text-foreground font-mono text-xs">{escrow.deposit_reference}</p></div>}
              {escrow.fc_notes && <div className="col-span-2"><p className="text-xs text-muted-foreground">FC Notes</p><p className="text-foreground text-xs italic">{escrow.fc_notes}</p></div>}
            </div>
          )}
          {!isFunded && <p className="text-xs text-amber-700">Finance Coordinator has not yet confirmed the deposit.</p>}
        </div>
      );
    },
  },
  {
    key: "maturity_level",
    label: "Maturity Level",
    attribution: "by Creator",
    dbField: "maturity_level",
    isFilled: (ch) => !!ch.maturity_level,
    render: (ch) => ch.maturity_level ? <Badge variant="secondary" className="capitalize">{ch.maturity_level}</Badge> : <p className="text-sm text-muted-foreground">Not set.</p>,
  },
  {
    key: "artifact_types",
    label: "Artifact Types",
    isFilled: () => false,
    render: () => <p className="text-sm text-muted-foreground italic">Artifact types derived from maturity level configuration.</p>,
  },
  {
    key: "visibility_eligibility",
    label: "Visibility & Eligibility",
    attribution: "by Creator",
    dbField: "eligibility",
    isFilled: (ch) => !!ch.visibility || !!ch.eligibility,
    render: (ch) => {
      if (!ch.visibility && !ch.eligibility) return <p className="text-sm text-muted-foreground italic">Not yet configured</p>;
      return (
        <div className="space-y-2">
          {ch.visibility && <div><p className="text-xs text-muted-foreground">Visibility</p><p className="text-sm text-foreground capitalize">{ch.visibility}</p></div>}
          {ch.eligibility && <div><p className="text-xs text-muted-foreground">Eligibility</p><p className="text-sm text-foreground">{ch.eligibility}</p></div>}
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Helper: extract current field value for editing
// ---------------------------------------------------------------------------
function getFieldValue(ch: ChallengeData, sectionKey: string): string {
  switch (sectionKey) {
    case "problem_statement": return ch.problem_statement ?? "";
    case "scope": return ch.scope ?? "";
    case "submission_guidelines": return ch.description ?? "";
    case "ip_model": return ch.ip_model ?? "";
    case "visibility_eligibility": return ch.eligibility ?? "";
    default: return "";
  }
}

function getDeliverableItems(ch: ChallengeData): string[] {
  const raw = parseJson<any>(ch.deliverables);
  const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return d.map((item: any) => typeof item === "string" ? item : item?.name ?? "");
}

function getEvalCriteria(ch: ChallengeData): { name: string; weight: number }[] {
  const raw = parseJson<any>(ch.evaluation_criteria);
  const ec = Array.isArray(raw) ? raw : Array.isArray(raw?.criteria) ? raw.criteria : [];
  return ec.map((c: any) => ({
    name: c.criterion_name ?? c.name ?? "",
    weight: c.weight_percentage ?? c.weight ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurationReviewPage() {
  // ══════════════════════════════════════
  // SECTION 1: Hooks & state
  // ══════════════════════════════════════
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: userRoleCodes = [] } = useUserChallengeRoles(user?.id, challengeId);

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [approvedSections, setApprovedSections] = useState<Record<string, boolean>>({});
  const [aiReviews, setAiReviews] = useState<SectionReview[]>([]);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Queries
  // ══════════════════════════════════════
  const { data: challenge, isLoading } = useQuery({
    queryKey: ["curation-review", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule, complexity_score, complexity_level, complexity_parameters, ip_model, maturity_level, visibility, eligibility, description, operating_model, governance_profile, current_phase, phase_status")
        .eq("id", challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data as ChallengeData;
    },
    enabled: !!challengeId,
  });

  const { data: legalDocs = [] } = useQuery({
    queryKey: ["curation-legal-summary", challengeId],
    queryFn: async (): Promise<LegalDocSummary[]> => {
      const { data, error } = await supabase
        .from("challenge_legal_docs")
        .select("tier, status")
        .eq("challenge_id", challengeId!);
      if (error) return [];
      const rows = data ?? [];
      const tiers = ["TIER_1", "TIER_2"];
      return tiers.map((tier) => {
        const ofTier = rows.filter((r) => r.tier === tier);
        return {
          tier: tier === "TIER_1" ? "Tier 1: Entry-Phase" : "Tier 2: Solution-Phase",
          total: ofTier.length,
          attached: ofTier.filter((r) => r.status === "default_applied" || r.status === "custom_uploaded" || r.status === "ATTACHED").length,
        };
      });
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const { data: legalDetails = [] } = useQuery({
    queryKey: ["curation-legal-details", challengeId],
    queryFn: async (): Promise<LegalDocDetail[]> => {
      const { data, error } = await supabase
        .from("challenge_legal_docs")
        .select("id, document_type, document_name, content_summary, lc_status, status, tier")
        .eq("challenge_id", challengeId!)
        .order("tier")
        .order("document_type");
      if (error) return [];
      return (data ?? []) as LegalDocDetail[];
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const { data: escrowRecord = null } = useQuery({
    queryKey: ["curation-escrow", challengeId],
    queryFn: async (): Promise<EscrowRecord | null> => {
      const { data, error } = await supabase
        .from("escrow_records")
        .select("id, escrow_status, deposit_amount, remaining_amount, bank_name, bank_branch, bank_address, currency, deposit_date, deposit_reference, fc_notes")
        .eq("challenge_id", challengeId!)
        .maybeSingle();
      if (error) return null;
      return data as EscrowRecord | null;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  // ══════════════════════════════════════
  // SECTION 3: Mutation — save section edit
  // ══════════════════════════════════════
  const saveSectionMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await supabase
        .from("challenges")
        .update({ [field]: value, updated_by: user?.id ?? null } as any)
        .eq("id", challengeId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
      toast.success("Section updated successfully");
      setEditingSection(null);
      setSavingSection(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
      setSavingSection(false);
    },
  });

  // ══════════════════════════════════════
  // SECTION 4: Handlers
  // ══════════════════════════════════════
  const handleSaveText = useCallback((sectionKey: string, dbField: string, value: string) => {
    setSavingSection(true);
    saveSectionMutation.mutate({ field: dbField, value });
  }, [saveSectionMutation]);

  const handleSaveDeliverables = useCallback((items: string[]) => {
    setSavingSection(true);
    saveSectionMutation.mutate({ field: "deliverables", value: { items } });
  }, [saveSectionMutation]);

  const handleSaveEvalCriteria = useCallback((criteria: { name: string; weight: number }[]) => {
    setSavingSection(true);
    const normalized = criteria.map((c) => ({
      criterion_name: c.name,
      weight_percentage: c.weight,
    }));
    saveSectionMutation.mutate({ field: "evaluation_criteria", value: { criteria: normalized } });
  }, [saveSectionMutation]);

  const handleAIReview = useCallback(async () => {
    if (!challengeId) return;
    setAiReviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
        body: { challenge_id: challengeId },
      });
      if (error) throw error;
      if (data?.success && data.data?.sections) {
        setAiReviews(data.data.sections);
        toast.success("AI review complete");
      } else {
        throw new Error(data?.error?.message ?? "AI review failed");
      }
    } catch (e: any) {
      toast.error(`AI review failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [challengeId]);

  const toggleSectionApproval = useCallback((key: string) => {
    setApprovedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const approvedCount = Object.values(approvedSections).filter(Boolean).length;
  const allSectionsApproved = approvedCount === SECTIONS.length;

  const handleSelectAll = useCallback((checked: boolean) => {
    const next: Record<string, boolean> = {};
    SECTIONS.forEach((s) => { next[s.key] = checked; });
    setApprovedSections(next);
  }, []);

  // ══════════════════════════════════════
  // SECTION 5: Computed
  // ══════════════════════════════════════
  const checklist = useMemo(() => {
    if (!challenge) return [];
    return SECTIONS.map((s) => ({
      key: s.key,
      label: s.label,
      filled: s.isFilled(challenge, legalDocs, legalDetails, escrowRecord),
    }));
  }, [challenge, legalDocs, legalDetails, escrowRecord]);

  // ══════════════════════════════════════
  // SECTION 6: Conditional returns
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-7 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
          <div className="lg:col-span-2"><Skeleton className="h-80 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return <div className="p-6 text-center text-muted-foreground">Challenge not found.</div>;
  }

  const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cogni/curation")} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-foreground truncate">Curation Review</h1>
          <p className="text-sm text-muted-foreground truncate">{challenge.title}</p>
        </div>
        <GovernanceProfileBadge profile={challenge.governance_profile} compact />

        {/* AI Review button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAIReview}
          disabled={aiReviewLoading}
          className="shrink-0"
        >
          {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
          Review by AI
        </Button>

        {user?.id && (
          <HoldResumeActions
            challengeId={challengeId!}
            challengeTitle={challenge.title}
            currentPhase={challenge.current_phase ?? 3}
            phaseStatus={challenge.phase_status ?? null}
            userId={user.id}
            userRoleCodes={userRoleCodes}
          />
        )}
      </div>

      {/* LEGAL_VERIFICATION_PENDING blocking banner */}
      {isLegalPending && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-50/60 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Legal documents must be attached before curation can begin.</p>
            <Button variant="link" className="h-auto p-0 text-sm text-primary" onClick={() => navigate(`/cogni/challenges/${challengeId}/legal`)}>
              Navigate to Legal Documents →
            </Button>
          </div>
        </div>
      )}

      {/* Section approval controls */}
      <div className="flex items-center gap-3 border border-border rounded-lg p-3 bg-muted/30">
        <Checkbox
          checked={allSectionsApproved}
          onCheckedChange={(val) => handleSelectAll(!!val)}
        />
        <span className="text-sm font-medium text-foreground">Select All Sections</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {approvedCount}/{SECTIONS.length} approved
        </span>
        {allSectionsApproved && <CheckCheck className="h-4 w-4 text-green-600" />}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT PANEL — 60% (3/5) */}
        <div className="lg:col-span-3 space-y-0">
          <Accordion type="multiple" defaultValue={["problem_statement"]} className="w-full">
            {SECTIONS.map((section) => {
              const filled = section.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
              const isLocked = LOCKED_SECTIONS.has(section.key);
              const isEditing = editingSection === section.key;
              const canEdit = !isLocked && !!section.dbField;
              const aiReview = aiReviews.find((r) => r.section_key === section.key);
              const isApproved = approvedSections[section.key] ?? false;

              return (
                <AccordionItem key={section.key} value={section.key}>
                  <AccordionTrigger className="text-sm font-medium hover:no-underline gap-2">
                    <div className="flex items-center gap-2 flex-1 text-left">
                      {/* Section approval checkbox */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isApproved}
                          onCheckedChange={() => toggleSectionApproval(section.key)}
                          className="shrink-0"
                        />
                      </div>
                      {filled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span>{section.label}</span>
                      {section.attribution && (
                        <span className="text-[10px] text-muted-foreground font-normal ml-1">({section.attribution})</span>
                      )}
                      {isLocked && <Lock className="h-3 w-3 text-muted-foreground ml-1" />}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-6">
                    {/* Edit / View toggle */}
                    {isEditing && section.key === "deliverables" && challenge ? (
                      <DeliverablesEditor
                        items={getDeliverableItems(challenge)}
                        onSave={handleSaveDeliverables}
                        onCancel={() => setEditingSection(null)}
                        saving={savingSection}
                      />
                    ) : isEditing && section.key === "evaluation_criteria" && challenge ? (
                      <EvalCriteriaEditor
                        criteria={getEvalCriteria(challenge)}
                        onSave={handleSaveEvalCriteria}
                        onCancel={() => setEditingSection(null)}
                        saving={savingSection}
                      />
                    ) : isEditing && TEXT_SECTIONS.has(section.key) && challenge && section.dbField ? (
                      <TextSectionEditor
                        value={getFieldValue(challenge, section.key)}
                        onSave={(val) => handleSaveText(section.key, section.dbField!, val)}
                        onCancel={() => setEditingSection(null)}
                        saving={savingSection}
                      />
                    ) : (
                      <>
                        {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
                        {canEdit && !isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs"
                            onClick={() => setEditingSection(section.key)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />Edit
                          </Button>
                        )}
                      </>
                    )}

                    {/* AI review inline */}
                    <CurationAIReviewInline sectionKey={section.key} review={aiReview} />
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* RIGHT PANEL — 40% (2/5) */}
        <div className="lg:col-span-2 space-y-4">
          <CurationChecklistPanel
            challengeId={challengeId!}
            challenge={challenge}
            legalDocs={legalDocs}
            escrowRecord={escrowRecord ? { escrow_status: escrowRecord.escrow_status } : null}
          />
          <AICurationQualityPanel challengeId={challengeId!} />
          <PaymentScheduleSection
            challengeId={challengeId!}
            rewardStructure={challenge.reward_structure}
          />
        </div>
      </div>
    </div>
  );
}
