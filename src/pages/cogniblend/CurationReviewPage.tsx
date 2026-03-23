/**
 * Curation Review Page — /cogni/curation/:id
 *
 * Grouped focus-area layout with:
 *  - TOP: Progress strip (4 groups)
 *  - LEFT (75%): Single-accordion sections per active group
 *  - RIGHT (25%): Action rail + AI summary
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HoldResumeActions } from "@/components/cogniblend/HoldResumeActions";
import { useUserChallengeRoles } from "@/hooks/cogniblend/useUserChallengeRoles";
import { useComplexityParams } from "@/hooks/queries/useComplexityParams";
import { MATURITY_LABELS, MATURITY_DESCRIPTIONS, getMaturityLabel } from "@/lib/maturityLabels";
import { Badge } from "@/components/ui/badge";
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ComplexityAssessmentModule } from "@/components/cogniblend/curation/ComplexityAssessmentModule";
import { SafeHtmlRenderer } from "@/components/ui/SafeHtmlRenderer";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Eye,
  Loader2,
  Sparkles,
  RefreshCw,
  Save,
  X,
  Tag,
} from "lucide-react";
import CurationActions from "@/components/cogniblend/curation/CurationActions";
import { CHALLENGE_TEMPLATES } from "@/lib/challengeTemplates";
import { useIndustrySegments } from "@/hooks/queries/useIndustrySegments";

import RewardStructureDisplay from "@/components/cogniblend/curation/RewardStructureDisplay";
import ModificationPointsTracker from "@/components/cogniblend/ModificationPointsTracker";
import { TextSectionEditor, DeliverablesEditor, EvalCriteriaEditor, DateFieldEditor, SelectFieldEditor, RadioFieldEditor } from "@/components/cogniblend/curation/CurationSectionEditor";
import ExtendedBriefDisplay from "@/components/cogniblend/curation/ExtendedBriefDisplay";
import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import type { Json } from "@/integrations/supabase/types";
import { CACHE_STANDARD } from "@/config/queryCache";
import { unwrapArray, unwrapEvalCriteria, isJsonFilled, parseJson as jsonParse } from "@/lib/cogniblend/jsonbUnwrap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeChallengeFields } from "@/lib/cogniblend/challengeFieldNormalizer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DOMAIN_TAGS = [
  'AI/ML', 'Biotech', 'Clean Energy', 'Materials Science',
  'Digital Health', 'Manufacturing', 'Software', 'Sustainability',
  'Cybersecurity', 'FinTech', 'IoT', 'Robotics',
  'Data Analytics', 'Supply Chain', 'Telecommunications',
];



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
  domain_tags: Json | null;
  ai_section_reviews: Json | null;
  currency_code: string | null;
  // Phase 1 additions
  submission_deadline: string | null;
  challenge_visibility: string | null;
  effort_level: string | null;
  hook: string | null;
  max_solutions: number | null;
  extended_brief: Json | null;
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
// Section definitions (same 15 items)
// ---------------------------------------------------------------------------

const LOCKED_SECTIONS = new Set(["legal_docs", "escrow_funding"]);
const TEXT_SECTIONS = new Set(["problem_statement", "scope", "submission_guidelines", "ip_model", "visibility_eligibility", "hook"]);

interface SectionDef {
  key: string;
  label: string;
  attribution?: string;
  dbField?: string;
  isFilled: (ch: ChallengeData, legalDocs: LegalDocSummary[], legalDetails: LegalDocDetail[], escrow: EscrowRecord | null) => boolean;
  render: (ch: ChallengeData, legalDocs: LegalDocSummary[], legalDetails: LegalDocDetail[], escrow: EscrowRecord | null) => React.ReactNode;
}

const SECTIONS: SectionDef[] = [
  {
    key: "problem_statement",
    label: "Problem Statement",
    attribution: "by CA",
    dbField: "problem_statement",
    isFilled: (ch) => !!ch.problem_statement?.trim(),
    render: (ch) => <AiContentRenderer content={ch.problem_statement} compact />,
  },
  {
    key: "scope",
    label: "Scope",
    attribution: "by CA",
    dbField: "scope",
    isFilled: (ch) => !!ch.scope?.trim(),
    render: (ch) => <AiContentRenderer content={ch.scope} compact />,
  },
  {
    key: "deliverables",
    label: "Deliverables",
    attribution: "by CA",
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
    key: "submission_guidelines",
    label: "Submission Guidelines",
    attribution: "by CA",
    dbField: "description",
    isFilled: (ch) => !!ch.description?.trim(),
    render: (ch) => <AiContentRenderer content={ch.description} compact fallback="—" />,
  },
  {
    key: "maturity_level",
    label: "Maturity Level",
    attribution: "by CA / Curator",
    dbField: "maturity_level",
    isFilled: (ch) => !!ch.maturity_level,
    render: (ch) => ch.maturity_level
      ? (
        <div className="space-y-1">
          <Badge variant="secondary" className="capitalize">{getMaturityLabel(ch.maturity_level)}</Badge>
          {MATURITY_DESCRIPTIONS[ch.maturity_level] && (
            <p className="text-xs text-muted-foreground">{MATURITY_DESCRIPTIONS[ch.maturity_level]}</p>
          )}
        </div>
      )
      : <p className="text-sm text-muted-foreground">Not set.</p>,
  },
  {
    key: "evaluation_criteria",
    label: "Evaluation Criteria",
    attribution: "by CA",
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
    attribution: "by Curator",
    dbField: "reward_structure",
    isFilled: (ch) => {
      const raw = parseJson<any>(ch.reward_structure);
      return raw != null && (Array.isArray(raw) ? raw.length > 0 : typeof raw === "object" && Object.keys(raw).length > 0);
    },
    render: (ch) => (
      <RewardStructureDisplay
        rewardStructure={ch.reward_structure}
        currencyCode={ch.currency_code ?? undefined}
        challengeId={ch.id}
        problemStatement={ch.problem_statement}
      />
    ),
  },
  {
    key: "complexity",
    label: "Complexity Assessment",
    attribution: "by Curator",
    isFilled: (ch) => ch.complexity_score != null || !!ch.complexity_level,
    render: () => null, // Rendered via ComplexityAssessmentModule component
  },
  {
    key: "ip_model",
    label: "IP Model",
    attribution: "by Curator",
    dbField: "ip_model",
    isFilled: (ch) => !!ch.ip_model?.trim(),
    render: (ch) => <p className="text-sm font-medium text-foreground">{ch.ip_model || "—"}</p>,
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
    isFilled: (ch, _ld, _ldd, escrow) => {
      const controlled = isControlledMode(resolveGovernanceMode(ch.governance_profile));
      return controlled ? escrow?.escrow_status === "FUNDED" : true;
    },
    render: (ch, _ld, _ldd, escrow) => {
      const controlled = isControlledMode(resolveGovernanceMode(ch.governance_profile));

      // Non-CONTROLLED modes: escrow is not required
      if (!controlled) {
        return (
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700">Escrow not required for this governance mode.</p>
          </div>
        );
      }

      // CONTROLLED mode: escrow is mandatory
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
    key: "domain_tags",
    label: "Domain Tags",
    attribution: "by Curator",
    dbField: "domain_tags",
    isFilled: (ch) => {
      const tags = parseJson<string[]>(ch.domain_tags);
      return Array.isArray(tags) && tags.length > 0;
    },
    render: () => null, // Rendered inline (YouTube-style always-editable)
  },
  {
    key: "phase_schedule",
    label: "Phase Schedule",
    attribution: "by CA",
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
    key: "visibility_eligibility",
    label: "Visibility & Eligibility",
    attribution: "by Curator",
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
  // ── Phase 1 additions: Challenge Settings (Org Policy) ──
  {
    key: "hook",
    label: "Challenge Hook",
    attribution: "AI / Creator",
    dbField: "hook",
    isFilled: (ch) => !!(ch as any).hook?.trim(),
    render: (ch) => <p className="text-sm text-foreground">{(ch as any).hook || "—"}</p>,
  },
  {
    key: "extended_brief",
    label: "Extended Brief",
    attribution: "AI Generated",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = (ch as any).extended_brief;
      if (!eb || typeof eb !== "object") return false;
      return !!(eb.context_background || eb.root_causes || (eb.affected_stakeholders?.length > 0));
    },
    render: () => null, // Rendered via ExtendedBriefDisplay component
  },
  {
    key: "submission_deadline",
    label: "Submission Deadline",
    attribution: "by Curator",
    dbField: "submission_deadline",
    isFilled: (ch) => !!(ch as any).submission_deadline,
    render: (ch) => {
      const dl = (ch as any).submission_deadline;
      return dl
        ? <p className="text-sm font-medium text-foreground">{new Date(dl).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
        : <p className="text-sm text-muted-foreground italic">Not set</p>;
    },
  },
  {
    key: "challenge_visibility",
    label: "Challenge Visibility",
    attribution: "by Curator",
    dbField: "challenge_visibility",
    isFilled: (ch) => !!(ch as any).challenge_visibility,
    render: (ch) => {
      const v = (ch as any).challenge_visibility;
      return v
        ? <Badge variant="secondary" className="capitalize">{v.replace(/_/g, " ")}</Badge>
        : <p className="text-sm text-muted-foreground italic">Not set</p>;
    },
  },
  {
    key: "effort_level",
    label: "Effort Level",
    attribution: "by Curator",
    dbField: "effort_level",
    isFilled: (ch) => !!(ch as any).effort_level,
    render: (ch) => {
      const e = (ch as any).effort_level;
      return e
        ? <Badge variant="outline" className="capitalize">{e}</Badge>
        : <p className="text-sm text-muted-foreground italic">Not set</p>;
    },
  },
];

// ---------------------------------------------------------------------------
// Group definitions
// ---------------------------------------------------------------------------

interface GroupDef {
  id: string;
  label: string;
  colorDone: string;
  colorActive: string;
  colorBorder: string;
  sectionKeys: string[];
}

const GROUPS: GroupDef[] = [
  {
    id: "content",
    label: "Content",
    colorDone: "bg-emerald-100 text-emerald-800 border-emerald-300",
    colorActive: "bg-emerald-50 border-emerald-400",
    colorBorder: "border-emerald-200",
    sectionKeys: ["problem_statement", "scope", "deliverables", "submission_guidelines", "maturity_level", "hook", "extended_brief"],
  },
  {
    id: "evaluation",
    label: "Evaluation",
    colorDone: "bg-blue-100 text-blue-800 border-blue-300",
    colorActive: "bg-blue-50 border-blue-400",
    colorBorder: "border-blue-200",
    sectionKeys: ["evaluation_criteria", "reward_structure", "payment_schedule", "complexity"],
  },
  {
    id: "legal_finance",
    label: "Legal & Finance",
    colorDone: "bg-amber-100 text-amber-800 border-amber-300",
    colorActive: "bg-amber-50 border-amber-400",
    colorBorder: "border-amber-200",
    sectionKeys: ["ip_model", "legal_docs", "escrow_funding", "domain_tags"],
  },
  {
    id: "publication",
    label: "Publication",
    colorDone: "bg-slate-100 text-slate-700 border-slate-300",
    colorActive: "bg-slate-50 border-slate-400",
    colorBorder: "border-slate-200",
    sectionKeys: ["phase_schedule", "visibility_eligibility", "submission_deadline", "challenge_visibility", "effort_level"],
  },
];

// Build section lookup
const SECTION_MAP = new Map(SECTIONS.map((s) => [s.key, s]));

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
    case "hook": return ch.hook ?? "";
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

// Get current content for any section (used by AI refinement)
function getSectionContent(ch: ChallengeData, sectionKey: string): string | null {
  switch (sectionKey) {
    case "problem_statement": return ch.problem_statement;
    case "scope": return ch.scope;
    case "submission_guidelines": return ch.description;
    case "ip_model": return ch.ip_model;
    case "visibility_eligibility": return ch.eligibility;
    case "deliverables": return ch.deliverables ? JSON.stringify(ch.deliverables) : null;
    case "evaluation_criteria": return ch.evaluation_criteria ? JSON.stringify(ch.evaluation_criteria) : null;
    case "reward_structure": return ch.reward_structure ? JSON.stringify(ch.reward_structure) : null;
    case "phase_schedule": return ch.phase_schedule ? JSON.stringify(ch.phase_schedule) : null;
    case "maturity_level": return ch.maturity_level;
    case "complexity": return ch.complexity_parameters ? JSON.stringify(ch.complexity_parameters) : null;
    case "hook": return ch.hook;
    case "submission_deadline": return ch.submission_deadline;
    case "challenge_visibility": return ch.challenge_visibility;
    case "effort_level": return ch.effort_level;
    case "extended_brief": return ch.extended_brief ? JSON.stringify(ch.extended_brief) : null;
    default: return null;
  }
}

// Map AI quality gaps to section keys
const GAP_FIELD_TO_SECTION: Record<string, string> = {
  problem_statement: "problem_statement",
  scope: "scope",
  deliverables: "deliverables",
  evaluation_criteria: "evaluation_criteria",
  reward_structure: "reward_structure",
  phase_schedule: "phase_schedule",
  complexity: "complexity",
  ip_model: "ip_model",
  eligibility: "visibility_eligibility",
  visibility: "visibility_eligibility",
  description: "submission_guidelines",
  maturity_level: "maturity_level",
  legal: "legal_docs",
  escrow: "escrow_funding",
};

// ---------------------------------------------------------------------------
// Checklist auto-check logic (reused from CurationChecklistPanel)
// ---------------------------------------------------------------------------

const CHECKLIST_LABELS: string[] = [
  "Problem Statement present",
  "Scope defined",
  "Deliverables listed",
  "Evaluation criteria weights = 100%",
  "Reward structure valid",
  "Phase schedule defined",
  "Submission guidelines provided",
  "Eligibility configured",
  "Taxonomy tags applied",
  "Tier 1 legal docs attached",
  "Tier 2 legal templates attached",
  "Complexity parameters entered",
  "Maturity level + legal match",
  "Artifact types configured",
  "Escrow funding confirmed",
] as const;

function computeAutoChecks(
  challenge: ChallengeData,
  legalDocs: LegalDocSummary[],
  escrowRecord: EscrowRecord | null,
): boolean[] {
  const tier1Docs = legalDocs.find((d) => d.tier.includes("Tier 1"));
  const tier2Docs = legalDocs.find((d) => d.tier.includes("Tier 2"));
  const evalCriteria = unwrapEvalCriteria(challenge.evaluation_criteria);
  const evalWeightSum = evalCriteria?.reduce((sum, c) => sum + (c.weight ?? 0), 0) ?? 0;

  return [
    !!challenge.problem_statement?.trim(),
    !!challenge.scope?.trim(),
    (() => {
      const d = unwrapArray(challenge.deliverables, "items");
      return !!d && d.length > 0;
    })(),
    evalWeightSum === 100,
    isJsonFilled(challenge.reward_structure),
    isJsonFilled(challenge.phase_schedule),
    !!challenge.description?.trim(),
    !!challenge.eligibility?.trim(),
    (() => {
      const tags = parseJson<string[]>(challenge.domain_tags);
      return Array.isArray(tags) && tags.length > 0;
    })(),
    !!tier1Docs && tier1Docs.attached > 0 && tier1Docs.attached === tier1Docs.total,
    !!tier2Docs && tier2Docs.attached > 0 && tier2Docs.attached === tier2Docs.total,
    challenge.complexity_score != null || !!challenge.complexity_parameters,
    !!challenge.maturity_level,
    (() => {
      const del = jsonParse<Record<string, unknown>>(challenge.deliverables);
      const artifacts = del?.permitted_artifact_types;
      return Array.isArray(artifacts) && artifacts.length > 0;
    })(),
    escrowRecord?.escrow_status === "FUNDED",
  ];
}

// ---------------------------------------------------------------------------
// AI Quality Summary (compact)
// ---------------------------------------------------------------------------

interface AIQualitySummary {
  overall_score: number;
  gaps: Array<{ field: string; severity: string; message: string }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurationReviewPage() {
  // ══════════════════════════════════════
  // SECTION 1: Hooks & state
  // ══════════════════════════════════════
  const { id: challengeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: userRoleCodes = [] } = useUserChallengeRoles(user?.id, challengeId);
  const { data: complexityParams = [] } = useComplexityParams();
  const { data: industrySegments } = useIndustrySegments();

  const [activeGroup, setActiveGroup] = useState<string>("content");
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const [approvedSections, setApprovedSections] = useState<Record<string, boolean>>({});
  const [aiReviews, setAiReviews] = useState<SectionReview[]>([]);
  const [aiReviewsLoaded, setAiReviewsLoaded] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>({});

  // AI quality assessment state
  const [aiQuality, setAiQuality] = useState<AIQualitySummary | null>(null);
  const [aiQualityLoading, setAiQualityLoading] = useState(false);


  // Domain tags editing state

  // Domain tags editing state
  const [domainTagInput, setDomainTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ══════════════════════════════════════
  // SECTION 2: Queries
  // ══════════════════════════════════════
  const { data: challenge, isLoading } = useQuery({
    queryKey: ["curation-review", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule, complexity_score, complexity_level, complexity_parameters, ip_model, maturity_level, visibility, eligibility, description, operating_model, governance_profile, current_phase, phase_status, domain_tags, ai_section_reviews, currency_code, submission_deadline, challenge_visibility, effort_level, hook, max_solutions, extended_brief")
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

  // Load persisted AI reviews from challenge data
  useEffect(() => {
    if (challenge?.ai_section_reviews && !aiReviewsLoaded) {
      const stored = Array.isArray(challenge.ai_section_reviews)
        ? (challenge.ai_section_reviews as unknown as SectionReview[])
        : [];
      if (stored.length > 0) {
        setAiReviews(stored);
      }
      setAiReviewsLoaded(true);
    }
  }, [challenge?.ai_section_reviews, aiReviewsLoaded]);

  // ══════════════════════════════════════
  // SECTION 3: Mutations
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

  const handleSaveMaturityLevel = useCallback((value: string) => {
    setSavingSection(true);
    saveSectionMutation.mutate({ field: "maturity_level", value: value.toUpperCase() });
  }, [saveSectionMutation]);

  const handleSaveExtendedBrief = useCallback((updatedBrief: Record<string, unknown>) => {
    setSavingSection(true);
    saveSectionMutation.mutate({ field: "extended_brief", value: updatedBrief });
  }, [saveSectionMutation]);

  const handleSaveOrgPolicyField = useCallback((dbField: string, value: unknown) => {
    setSavingSection(true);
    saveSectionMutation.mutate({ field: dbField, value });
  }, [saveSectionMutation]);

  const handleSaveComplexity = useCallback((
    paramValues: Record<string, number>,
    score: number,
    level: string,
  ) => {
    setSavingSection(true);
    const params = complexityParams.map((p) => ({
      param_key: p.param_key,
      name: p.name,
      value: paramValues[p.param_key] ?? 5,
      weight: p.weight,
    }));
    const updates = {
      complexity_parameters: params,
      complexity_score: score,
      complexity_level: level,
      updated_by: user?.id ?? null,
    };
    supabase
      .from("challenges")
      .update(updates as any)
      .eq("id", challengeId!)
      .then(({ error }) => {
        if (error) {
          toast.error(`Failed to save: ${error.message}`);
        } else {
          queryClient.invalidateQueries({ queryKey: ["curation-review", challengeId] });
          toast.success("Complexity assessment updated");
        }
        setSavingSection(false);
      });
  }, [complexityParams, challengeId, user?.id, queryClient]);

  /** Domain tags — auto-save on each add/remove (YouTube-style) */
  const handleAddDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const trimmed = tag.trim();
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    if (trimmed && !current.includes(trimmed)) {
      const updated = [...current, trimmed];
      saveSectionMutation.mutate({ field: "domain_tags", value: updated });
    }
    setDomainTagInput("");
    setShowTagDropdown(false);
  }, [challenge, saveSectionMutation]);

  const handleRemoveDomainTag = useCallback((tag: string) => {
    if (!challenge) return;
    const existing = parseJson<string[]>(challenge.domain_tags);
    const current = Array.isArray(existing) ? existing : [];
    const updated = current.filter((t) => t !== tag);
    saveSectionMutation.mutate({ field: "domain_tags", value: updated });
  }, [challenge, saveSectionMutation]);

  const handleAIReview = useCallback(async () => {
    if (!challengeId) return;
    setAiReviewLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("review-challenge-sections", {
        body: { challenge_id: challengeId },
      });
      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }
      if (data?.success && data.data?.all_reviews) {
        const allReviews = data.data.all_reviews as SectionReview[];
        setAiReviews(allReviews);
        // Persist batch reviews to DB so they survive navigation
        saveSectionMutation.mutate({ field: "ai_section_reviews", value: allReviews });
        const sections = data.data.sections as SectionReview[];
        const counts = { pass: 0, warning: 0, needs_revision: 0 };
        sections.forEach((s: SectionReview) => { counts[s.status] = (counts[s.status] || 0) + 1; });
        toast.success(`AI review complete — ${counts.pass} pass, ${counts.warning} warnings, ${counts.needs_revision} needs revision`);
      } else {
        throw new Error(data?.error?.message ?? "Unexpected response from AI review");
      }
    } catch (e: any) {
      toast.error(`AI review failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setAiReviewLoading(false);
    }
  }, [challengeId]);

  const handleAIQualityAnalysis = useCallback(async () => {
    if (!challengeId) return;
    setAiQualityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-challenge-quality", {
        body: { challenge_id: challengeId },
      });
      if (error) {
        let msg = error.message;
        try { const body = await (error as any).context?.json?.(); msg = body?.error?.message ?? msg; } catch {}
        throw new Error(msg);
      }
      if (data?.success && data?.data) {
        const score = data.data.overall_score ?? 0;
        const gaps = data.data.gaps ?? [];
        setAiQuality({ overall_score: score, gaps });
        toast.success(`AI analysis complete — Score: ${score}/100, ${gaps.length} gap${gaps.length !== 1 ? "s" : ""} found`);
      } else {
        throw new Error(data?.error?.message ?? "Unexpected response from AI analysis");
      }
    } catch (e: any) {
      toast.error(`AI analysis failed: ${e.message ?? "Unknown error"}`);
    } finally {
      setAiQualityLoading(false);
    }
  }, [challengeId]);

  const handleAcceptRefinement = useCallback((sectionKey: string, newContent: string) => {
    // Map section key to db field
    const section = SECTION_MAP.get(sectionKey);
    const dbField = section?.dbField;
    if (!dbField) {
      toast.error("Cannot save refinement for this section type.");
      return;
    }

    // For constrained fields, normalize through challengeFieldNormalizer
    // to extract the DB code from AI-generated descriptive text
    let valueToSave: any = newContent;
    const CONSTRAINED_FIELDS = ['maturity_level', 'ip_model', 'complexity_level', 'rejection_fee_percentage'];
    if (CONSTRAINED_FIELDS.includes(dbField)) {
      try {
        const normalized = normalizeChallengeFields({ [dbField]: newContent });
        valueToSave = normalized[dbField];
      } catch {
        // AI may return descriptive text like "IP-NEL (Non-Exclusive License): ..."
        // Try to extract the code from the beginning of the string
        const codeMatch = newContent.match(/^(IP-[A-Z]+|L[1-5]|BLUEPRINT|POC|PROTOTYPE|PILOT)/i);
        if (codeMatch) {
          try {
            const retryNormalized = normalizeChallengeFields({ [dbField]: codeMatch[1] });
            valueToSave = retryNormalized[dbField];
          } catch (e2: any) {
            toast.error(`Invalid ${dbField}: ${e2.message}`);
            return;
          }
        } else {
          toast.error(`Could not extract a valid ${dbField} code from AI refinement.`);
          return;
        }
      }
    }

    setSavingSection(true);
    saveSectionMutation.mutate({ field: dbField, value: valueToSave });
  }, [saveSectionMutation]);

  /** Handle a single-section re-review result from the inline panel */
  const handleSingleSectionReview = useCallback((sectionKey: string, freshReview: SectionReview) => {
    setAiReviews((prev) => {
      const filtered = prev.filter((r) => r.section_key !== sectionKey);
      const updated = [...filtered, { ...freshReview, addressed: false }];
      // Persist updated reviews to DB
      saveSectionMutation.mutate({ field: "ai_section_reviews", value: updated });
      return updated;
    });
  }, [saveSectionMutation]);

  /** Persist "addressed" flag when a refinement is accepted */
  const handleMarkAddressed = useCallback((sectionKey: string) => {
    setAiReviews((prev) => {
      const updated = prev.map((r) =>
        r.section_key === sectionKey ? { ...r, addressed: true } : r
      );
      // Persist to DB so state survives navigation
      saveSectionMutation.mutate({ field: "ai_section_reviews", value: updated });
      return updated;
    });
  }, [saveSectionMutation]);


  const toggleSectionApproval = useCallback((key: string) => {
    setApprovedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleGroupClick = useCallback((groupId: string) => {
    setActiveGroup(groupId);
  }, []);

  // ══════════════════════════════════════
  // SECTION 5: Computed
  // ══════════════════════════════════════
  const autoChecks = useMemo(() => {
    if (!challenge) return Array(15).fill(false);
    return computeAutoChecks(challenge, legalDocs, escrowRecord);
  }, [challenge, legalDocs, escrowRecord]);

  const checklistItems = useMemo(() =>
    CHECKLIST_LABELS.map((label, i) => ({
      id: i + 1,
      label,
      autoChecked: autoChecks[i],
      manualOverride: manualOverrides[i + 1] ?? false,
      passed: autoChecks[i] || (manualOverrides[i + 1] ?? false),
    })), [autoChecks, manualOverrides]);

  const completedCount = checklistItems.filter((i) => i.passed).length;
  const allComplete = completedCount === 15;

  const checklistSummary = useMemo(() =>
    checklistItems.map((item) => ({
      id: item.id,
      label: item.label,
      passed: item.passed,
      method: item.autoChecked ? "auto" : "manual",
    })), [checklistItems]);

  // Group progress computation
  const groupProgress = useMemo(() => {
    if (!challenge) return {};
    const result: Record<string, { done: number; total: number; hasAIFlag: boolean }> = {};
    GROUPS.forEach((g) => {
      const secs = g.sectionKeys.map((k) => SECTION_MAP.get(k)).filter(Boolean) as SectionDef[];
      const done = secs.filter((s) => s.isFilled(challenge, legalDocs, legalDetails, escrowRecord)).length;
      const hasAIFlag = aiQuality?.gaps?.some((gap) => {
        const mapped = GAP_FIELD_TO_SECTION[gap.field] ?? gap.field;
        return g.sectionKeys.includes(mapped);
      }) ?? false;
      result[g.id] = { done, total: secs.length, hasAIFlag };
    });
    return result;
  }, [challenge, legalDocs, legalDetails, escrowRecord, aiQuality]);

  // Inline AI flags per section from quality gaps
  const sectionAIFlags = useMemo(() => {
    if (!aiQuality?.gaps) return {};
    const map: Record<string, string[]> = {};
    aiQuality.gaps.forEach((gap) => {
      const sectionKey = GAP_FIELD_TO_SECTION[gap.field] ?? gap.field;
      if (!map[sectionKey]) map[sectionKey] = [];
      map[sectionKey].push(gap.message);
    });
    return map;
  }, [aiQuality]);

  const activeGroupDef = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];

  // Challenge context for AI refinement
  const challengeCtx = useMemo(() => ({
    title: challenge?.title,
    maturity_level: challenge?.maturity_level,
    domain_tags: (() => {
      if (!challenge?.domain_tags) return [];
      const parsed = parseJson<string[]>(challenge.domain_tags);
      return Array.isArray(parsed) ? parsed : [];
    })(),
  }), [challenge?.title, challenge?.maturity_level, challenge?.domain_tags]);

  // ══════════════════════════════════════
  // SECTION 6: Conditional returns
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-7 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
          <div><Skeleton className="h-60 w-full" /></div>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return <div className="p-6 text-center text-muted-foreground">Challenge not found.</div>;
  }

  const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';
  const isReadOnly = (challenge.current_phase ?? 0) < 3 || searchParams.get('mode') === 'view';

  const phaseDescription = challenge.current_phase === 1
    ? 'Spec Creation (Phase 1)'
    : challenge.current_phase === 2
      ? 'Legal & Finance Review (Phase 2)'
      : '';

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
          <h1 className="text-xl font-bold text-foreground truncate">
            {isReadOnly ? 'Curation Preview' : 'Curation Review'}
          </h1>
          <p className="text-sm text-muted-foreground truncate">{challenge.title}</p>
        </div>
        {isReadOnly && (
          <Badge variant="outline" className="text-xs shrink-0 gap-1">
            <Eye className="h-3 w-3" />View Only
          </Badge>
        )}
        <GovernanceProfileBadge profile={challenge.governance_profile} compact />

        {user?.id && !isReadOnly && (
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

      {/* Read-only banner for Phase 1/2 */}
      {isReadOnly && phaseDescription && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-400/40 bg-blue-50/60 dark:bg-blue-900/20 dark:border-blue-700/40 p-4">
          <Eye className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              This challenge is in {phaseDescription} — view only.
            </p>
            <p className="text-xs text-muted-foreground">
              Editing will be enabled once Legal & Finance review is complete and the challenge advances to Phase 3 (Curation).
            </p>
          </div>
        </div>
      )}

      {/* LEGAL_VERIFICATION_PENDING banner */}
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

      {/* ═══ ORIGINAL BRIEF (Seeding Data) ═══ */}
      {challenge.problem_statement && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="original-brief" className="border border-border rounded-lg">
            <AccordionTrigger className="px-4 py-2 text-sm font-semibold hover:no-underline gap-2">
              <div className="flex items-center gap-2 flex-1 text-left">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Original Brief from {challenge.operating_model === 'MP' ? 'Account Manager' : 'Challenge Requestor'}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">Read Only</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 space-y-3">
              {/* Challenge Template */}
              {(() => {
                const extBrief = parseJson<any>(challenge.extended_brief);
                const templateId = extBrief?.challenge_template_id;
                const template = templateId ? CHALLENGE_TEMPLATES.find(t => t.id === templateId) : null;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Challenge Template</p>
                    {template ? (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        <span className="mr-1">{template.emoji}</span>{template.name}
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">No template selected</p>
                    )}
                  </div>
                );
              })()}

              {/* Industry Segment */}
              {(() => {
                const targeting = parseJson<any>(challenge.eligibility);
                const segmentId = targeting?.industry_segment_id;
                const segmentName = industrySegments?.find(s => s.id === segmentId)?.name;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Industry Segment</p>
                    {segmentName ? (
                      <Badge variant="outline" className="mt-1 text-xs">{segmentName}</Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">No industry segment specified</p>
                    )}
                  </div>
                );
              })()}

              <div>
                <p className="text-xs font-medium text-muted-foreground">Problem Statement</p>
                <p className="text-sm text-foreground mt-0.5">{challenge.problem_statement || '—'}</p>
              </div>
              {(() => {
                const reward = parseJson<any>(challenge.reward_structure);
                if (!reward) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Budget Range</p>
                    <p className="text-sm text-foreground mt-0.5">
                      {reward.currency ?? 'USD'} {(reward.budget_min ?? 0).toLocaleString()} – {(reward.budget_max ?? 0).toLocaleString()}
                    </p>
                  </div>
                );
              })()}
              {(() => {
                const sched = parseJson<any>(challenge.phase_schedule);
                if (!sched?.expected_timeline) return null;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Timeline Urgency</p>
                    <p className="text-sm text-foreground mt-0.5">{sched.expected_timeline} months</p>
                  </div>
                );
              })()}

              {/* Solution Expectations */}
              {(() => {
                const extBrief = parseJson<any>(challenge.extended_brief);
                const val = extBrief?.solution_expectations;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Solution Expectations</p>
                    {val && String(val).trim() ? (
                      <p className="text-sm text-foreground mt-0.5">{String(val)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">No content added</p>
                    )}
                  </div>
                );
              })()}

              {/* Beneficiaries Mapping */}
              {(() => {
                const extBrief = parseJson<any>(challenge.extended_brief);
                const val = extBrief?.beneficiaries_mapping;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Beneficiaries Mapping</p>
                    {val && String(val).trim() ? (
                      <p className="text-sm text-foreground mt-0.5">{String(val)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">No content added</p>
                    )}
                  </div>
                );
              })()}

              {/* AM Approval Required (MP only) */}
              {challenge.operating_model === 'MP' && (() => {
                const extBrief = parseJson<any>(challenge.extended_brief);
                const amApproval = extBrief?.am_approval_required;
                return (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">AM Approval Required</p>
                    {amApproval ? (
                      <Badge className="mt-1 text-[10px] bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
                        <AlertTriangle className="h-3 w-3 mr-1" />AM Gate Active
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground italic mt-0.5">No — direct to curation</p>
                    )}
                  </div>
                );
              })()}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* ═══ PROGRESS STRIP ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {GROUPS.map((group) => {
          const progress = groupProgress[group.id];
          const done = progress?.done ?? 0;
          const total = progress?.total ?? 0;
          const isActive = activeGroup === group.id;
          const allDone = done === total && total > 0;
          const hasFlag = progress?.hasAIFlag ?? false;

          let statusColor = "bg-muted/50 text-muted-foreground border-border"; // not started
          if (allDone) statusColor = group.colorDone;
          else if (done > 0) statusColor = "bg-blue-50 text-blue-800 border-blue-300";
          if (hasFlag && !allDone) statusColor = "bg-amber-50 text-amber-800 border-amber-300";

          return (
            <button
              key={group.id}
              onClick={() => handleGroupClick(group.id)}
              className={cn(
                "rounded-lg border-2 p-3 text-left transition-all",
                statusColor,
                isActive && "ring-2 ring-primary ring-offset-2",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{group.label}</span>
                {allDone && <CheckCircle2 className="h-4 w-4" />}
                {hasFlag && !allDone && <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={total > 0 ? (done / total) * 100 : 0} className="h-1.5 flex-1" />
                <span className="text-xs font-medium">{done}/{total}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ MAIN LAYOUT: Content + Right Rail ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT — Main Content (3/4) */}
        <div className="lg:col-span-3">
          <Card className={cn("border-2", activeGroupDef.colorBorder)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{activeGroupDef.label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Accordion type="single" collapsible className="w-full">
                {activeGroupDef.sectionKeys.map((sectionKey) => {
                  const section = SECTION_MAP.get(sectionKey);
                  if (!section) return null;

                  const filled = section.isFilled(challenge, legalDocs, legalDetails, escrowRecord);
                  const isLocked = LOCKED_SECTIONS.has(section.key);
                  const isEditing = editingSection === section.key;
                  const canEdit = !isReadOnly && !isLocked && (!!section.dbField || section.key === "complexity");
                  const aiReview = aiReviews.find((r) => r.section_key === section.key);
                  const isApproved = approvedSections[section.key] ?? false;
                  const inlineFlags = sectionAIFlags[section.key];

                  // Special renders
                  
                  const isComplexity = section.key === "complexity";

                  // Filtered domain tag suggestions (plain calculation)
                  const currentTags = section.key === "domain_tags"
                    ? (() => { const t = parseJson<string[]>(challenge.domain_tags); return Array.isArray(t) ? t : []; })()
                    : [];
                  const filteredTags = section.key === "domain_tags" && domainTagInput
                    ? DEFAULT_DOMAIN_TAGS.filter(
                        (tag) => tag.toLowerCase().includes(domainTagInput.toLowerCase()) && !currentTags.includes(tag),
                      )
                    : [];

                  return (
                    <AccordionItem key={section.key} value={section.key} className="border-b border-border/40">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline gap-2 py-3">
                        <div className="flex items-center gap-2 flex-1 text-left min-w-0">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isApproved}
                              onCheckedChange={() => toggleSectionApproval(section.key)}
                              className="shrink-0"
                              disabled={isReadOnly}
                            />
                          </div>
                          {filled ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          <span className="truncate">{section.label}</span>
                          {section.attribution && (
                            <span className="text-[10px] text-muted-foreground font-normal ml-1 shrink-0">({section.attribution})</span>
                          )}
                          {isLocked && <Lock className="h-3 w-3 text-muted-foreground ml-1 shrink-0" />}
                          {/* Inline AI flags */}
                          {inlineFlags && inlineFlags.length > 0 && (
                            <span className="text-[10px] text-amber-700 ml-2 truncate shrink min-w-0">
                              ⚠ {inlineFlags[0]}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-8 pr-2 pb-4">
                        {/* ── Maturity Level Editor ── */}
                        {isEditing && section.key === "maturity_level" ? (
                          <div className="space-y-3">
                            <Select
                              value={challenge.maturity_level ?? ""}
                              onValueChange={(val) => handleSaveMaturityLevel(val)}
                            >
                              <SelectTrigger className="w-full max-w-xs">
                                <SelectValue placeholder="Select maturity level" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(MATURITY_LABELS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>
                                    <div>
                                      <span className="font-medium">{label}</span>
                                      {MATURITY_DESCRIPTIONS[key] && (
                                        <span className="text-xs text-muted-foreground ml-2">— {MATURITY_DESCRIPTIONS[key]}</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => setEditingSection(null)} disabled={savingSection}>
                              <X className="h-3.5 w-3.5 mr-1" />Cancel
                            </Button>
                          </div>

                        /* ── Complexity Assessment Module (always-visible) ── */
                        ) : isComplexity ? (
                          <ComplexityAssessmentModule
                            challengeId={challengeId!}
                            currentScore={challenge.complexity_score ?? null}
                            currentLevel={challenge.complexity_level ?? null}
                            currentParams={parseJson<any[]>(challenge.complexity_parameters) ?? null}
                            complexityParams={complexityParams}
                            onSave={handleSaveComplexity}
                            saving={savingSection}
                          />


                        /* ── Deliverables Editor ── */
                        ) : isEditing && section.key === "deliverables" ? (
                          <DeliverablesEditor
                            items={getDeliverableItems(challenge)}
                            onSave={handleSaveDeliverables}
                            onCancel={() => setEditingSection(null)}
                            saving={savingSection}
                          />
                        ) : isEditing && section.key === "evaluation_criteria" ? (
                          <EvalCriteriaEditor
                            criteria={getEvalCriteria(challenge)}
                            onSave={handleSaveEvalCriteria}
                            onCancel={() => setEditingSection(null)}
                            saving={savingSection}
                          />
                        ) : isEditing && TEXT_SECTIONS.has(section.key) && section.dbField ? (
                          <TextSectionEditor
                            value={getFieldValue(challenge, section.key)}
                            onSave={(val) => handleSaveText(section.key, section.dbField!, val)}
                            onCancel={() => setEditingSection(null)}
                            saving={savingSection}
                          />
                        /* ── Extended Brief — Always rendered via component ── */
                        ) : section.key === "extended_brief" ? (
                          <ExtendedBriefDisplay
                            data={challenge.extended_brief}
                            onSave={handleSaveExtendedBrief}
                            saving={savingSection}
                          />

                        /* ── Submission Deadline — Inline date editor ── */
                        ) : isEditing && section.key === "submission_deadline" ? (
                          <DateFieldEditor
                            value={challenge.submission_deadline ?? ""}
                            onSave={(val) => handleSaveOrgPolicyField("submission_deadline", val)}
                            onCancel={() => setEditingSection(null)}
                            saving={savingSection}
                          />

                        /* ── Challenge Visibility — Inline select ── */
                        ) : isEditing && section.key === "challenge_visibility" ? (
                          <SelectFieldEditor
                            value={challenge.challenge_visibility ?? ""}
                            options={[
                              { value: "public", label: "Public" },
                              { value: "private", label: "Private" },
                              { value: "invite_only", label: "Invite Only" },
                            ]}
                            onSave={(val) => handleSaveOrgPolicyField("challenge_visibility", val)}
                            onCancel={() => setEditingSection(null)}
                            saving={savingSection}
                          />

                        /* ── Effort Level — Inline radio ── */
                        ) : isEditing && section.key === "effort_level" ? (
                          <RadioFieldEditor
                            value={challenge.effort_level ?? ""}
                            options={[
                              { value: "low", label: "Low", description: "< 40 hours estimated effort" },
                              { value: "medium", label: "Medium", description: "40–160 hours estimated effort" },
                              { value: "high", label: "High", description: "160–500 hours estimated effort" },
                              { value: "expert", label: "Expert", description: "500+ hours, deep domain expertise" },
                            ]}
                            onSave={(val) => handleSaveOrgPolicyField("effort_level", val)}
                            onCancel={() => setEditingSection(null)}
                            saving={savingSection}
                          />

                        /* ── Domain Tags — Always-editable inline (unless read-only) ── */
                        ) : section.key === "domain_tags" && !isReadOnly ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
                              {currentTags.length === 0 && (
                                <p className="text-sm text-muted-foreground italic">No domain tags — type below to add.</p>
                              )}
                              {currentTags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1">
                                  <Tag className="h-3 w-3" />{tag}
                                  <button onClick={() => handleRemoveDomainTag(tag)} className="ml-0.5 hover:text-destructive">
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            <div className="relative">
                              <Input
                                value={domainTagInput}
                                onChange={(e) => {
                                  setDomainTagInput(e.target.value);
                                  setShowTagDropdown(true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && domainTagInput.trim()) {
                                    e.preventDefault();
                                    handleAddDomainTag(domainTagInput);
                                  }
                                }}
                                onFocus={() => setShowTagDropdown(true)}
                                onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
                                placeholder="Type to search or add a tag…"
                                className="text-sm"
                              />
                              {showTagDropdown && filteredTags.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
                                  {filteredTags.map((tag) => (
                                    <button
                                      key={tag}
                                      onClick={() => handleAddDomainTag(tag)}
                                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
                            {canEdit && !isEditing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-3 text-xs"
                                onClick={() => setEditingSection(section.key)}
                              >
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        )}

                        {/* AI review inline — interactive with refinement */}
                        <CurationAIReviewInline
                          sectionKey={section.key}
                          review={aiReview}
                          currentContent={getSectionContent(challenge, section.key)}
                          challengeId={challengeId!}
                          challengeContext={challengeCtx}
                          onAcceptRefinement={handleAcceptRefinement}
                          onSingleSectionReview={handleSingleSectionReview}
                          onMarkAddressed={handleMarkAddressed}
                          defaultOpen={!aiReview?.addressed && (aiReview?.status === 'warning' || aiReview?.status === 'needs_revision')}
                        />

                        {/* All inline AI flags expanded */}
                        {inlineFlags && inlineFlags.length > 1 && (
                          <div className="mt-2 space-y-1">
                            {inlineFlags.slice(1).map((flag, i) => (
                              <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                {flag}
                              </p>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT RAIL (1/4) */}
        <div className="space-y-4">
          {/* AI Quality Summary (compact) */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Quality
                </CardTitle>
                {!isReadOnly && (
                  <Button
                    size="sm"
                    variant={aiQuality ? "ghost" : "outline"}
                    onClick={handleAIQualityAnalysis}
                    disabled={aiQualityLoading}
                    className="text-xs h-7 px-2"
                  >
                    {aiQualityLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : aiQuality ? (
                      <RefreshCw className="h-3.5 w-3.5" />
                    ) : (
                      "Analyze"
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {aiQuality ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "text-2xl font-bold",
                      aiQuality.overall_score >= 80 ? "text-primary" :
                      aiQuality.overall_score >= 60 ? "text-amber-600" :
                      "text-destructive"
                    )}>
                      {aiQuality.overall_score}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {aiQuality.gaps.length} gap{aiQuality.gaps.length !== 1 ? "s" : ""} found
                    </div>
                  </div>
                  <Progress value={aiQuality.overall_score} className="h-1.5" />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Run analysis to get quality scores and identify gaps.</p>
              )}
            </CardContent>
          </Card>

          {/* Per-section AI Review button */}
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIReview}
              disabled={aiReviewLoading}
              className="w-full"
            >
              {aiReviewLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Bot className="h-4 w-4 mr-1.5" />}
              Review Sections by AI
            </Button>
          )}

          {/* AI Review Summary */}
          {aiReviews.length > 0 && (() => {
            const counts = { pass: 0, warning: 0, needs_revision: 0 };
            aiReviews.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
            const revisionSections = aiReviews.filter((r) => r.status === "needs_revision");
            const warningSections = aiReviews.filter((r) => r.status === "warning");
            return (
              <Card className="border-border">
                <CardContent className="pt-3 pb-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">{counts.pass} Pass</Badge>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">{counts.warning} Warning</Badge>
                    <Badge className="bg-red-100 text-red-800 border-red-300 text-[10px]">{counts.needs_revision} Needs Revision</Badge>
                  </div>
                  {revisionSections.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-destructive uppercase tracking-wide">Needs Revision</p>
                      {revisionSections.map((r) => {
                        const section = SECTION_MAP.get(r.section_key);
                        return (
                          <button
                            key={r.section_key}
                            className="text-xs text-destructive hover:underline block text-left w-full truncate"
                            onClick={() => {
                              const group = GROUPS.find((g) => g.sectionKeys.includes(r.section_key));
                              if (group) setActiveGroup(group.id);
                            }}
                          >
                            • {section?.label ?? r.section_key}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {warningSections.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide">Warnings</p>
                      {warningSections.map((r) => {
                        const section = SECTION_MAP.get(r.section_key);
                        return (
                          <button
                            key={r.section_key}
                            className="text-xs text-amber-700 hover:underline block text-left w-full truncate"
                            onClick={() => {
                              const group = GROUPS.find((g) => g.sectionKeys.includes(r.section_key));
                              if (group) setActiveGroup(group.id);
                            }}
                          >
                            • {section?.label ?? r.section_key}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Action buttons + return modal + modification cycle */}
          <CurationActions
            challengeId={challengeId!}
            phaseStatus={challenge.phase_status ?? null}
            allComplete={allComplete}
            checklistSummary={checklistSummary}
            completedCount={completedCount}
            totalCount={15}
            operatingModel={challenge.operating_model}
            readOnly={isReadOnly}
          />

          {/* Modification Points Tracker */}
          <ModificationPointsTracker challengeId={challengeId!} mode={isReadOnly ? "readonly" : "curator"} />
        </div>
      </div>
    </div>
  );
}
