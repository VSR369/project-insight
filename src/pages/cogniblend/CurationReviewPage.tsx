/**
 * Curation Review Page — /cogni/curation/:id
 *
 * Grouped focus-area layout with:
 *  - TOP: Progress strip (4 groups)
 *  - LEFT (75%): Single-accordion sections per active group
 *  - RIGHT (25%): Action rail + AI summary
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { HoldResumeActions } from "@/components/cogniblend/HoldResumeActions";
import { useUserChallengeRoles } from "@/hooks/cogniblend/useUserChallengeRoles";
import { useComplexityParams } from "@/hooks/queries/useComplexityParams";
import { getMaturityLabel } from "@/lib/maturityLabels";
import { useCurationMasterData } from "@/hooks/cogniblend/useCurationMasterData";
import { contentRequiresHumanInput } from "@/lib/cogniblend/creatorDataTransformer";
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
import {
  RichTextSectionRenderer,
  LineItemsSectionRenderer,
  TableSectionRenderer,
  ScheduleTableSectionRenderer,
  CheckboxSingleSectionRenderer,
  CheckboxMultiSectionRenderer,
  DateSectionRenderer,
  SelectSectionRenderer,
  RadioSectionRenderer,
  TagInputSectionRenderer,
  StructuredFieldsSectionRenderer,
  LegalDocsSectionRenderer,
} from "@/components/cogniblend/curation/renderers";
import ExtendedBriefDisplay from "@/components/cogniblend/curation/ExtendedBriefDisplay";
import { SendForModificationModal } from "@/components/cogniblend/curation/SendForModificationModal";
import SolverExpertiseSection from "@/components/cogniblend/curation/SolverExpertiseSection";
import { CurationAIReviewInline, type SectionReview } from "@/components/cogniblend/curation/CurationAIReviewPanel";
import { CuratorSectionPanel, type SectionStatus } from "@/components/cogniblend/curation/CuratorSectionPanel";
import { SECTION_FORMAT_CONFIG, LOCKED_SECTIONS as FORMAT_LOCKED_SECTIONS, AI_REVIEW_DISABLED_SECTIONS, EXTENDED_BRIEF_FIELD_MAP, EXTENDED_BRIEF_SUBSECTION_KEYS } from "@/lib/cogniblend/curationSectionFormats";
import type { Json } from "@/integrations/supabase/types";
import { CACHE_STANDARD } from "@/config/queryCache";
import { unwrapArray, unwrapEvalCriteria, isJsonFilled, parseJson as jsonParse } from "@/lib/cogniblend/jsonbUnwrap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeChallengeFields } from "@/lib/cogniblend/challengeFieldNormalizer";






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
  // Phase 5A: solver-tier fields for eligibility/visibility
  solver_eligibility_types: Json | null;
  solver_visibility_types: Json | null;
  // Phase: solver expertise requirements
  solver_expertise_requirements: Json | null;
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
const TEXT_SECTIONS = new Set(["problem_statement", "scope", "hook"]);

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
        <div className="space-y-2">
          {d.map((item: any, i: number) => (
            <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
              {typeof item === "string" ? item : item?.name ?? JSON.stringify(item)}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "submission_guidelines",
    label: "Submission Guidelines",
    attribution: "by CA",
    dbField: "description",
    isFilled: (ch) => {
      const raw = parseJson<any>(ch.description);
      const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
      if (items && items.length > 0) return true;
      return !!ch.description?.trim();
    },
    render: (ch) => {
      // Try parsing as structured line items first
      const raw = parseJson<any>(ch.description);
      const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
      if (items && items.length > 0) {
        return (
          <div className="space-y-2">
            {items.map((item: any, i: number) => (
              <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
                {typeof item === "string" ? item : item?.name ?? JSON.stringify(item)}
              </div>
            ))}
          </div>
        );
      }
      // Fallback to rich text display
      return <AiContentRenderer content={ch.description} compact fallback="—" />;
    },
  },
  {
    key: "expected_outcomes",
    label: "Expected Outcomes",
    attribution: "by CA",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const outcomes = eb?.expected_outcomes;
      return Array.isArray(outcomes) && outcomes.length > 0;
    },
    render: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const outcomes = Array.isArray(eb?.expected_outcomes) ? eb.expected_outcomes : [];
      if (outcomes.length === 0) return <p className="text-sm text-muted-foreground">None defined.</p>;
      return (
        <div className="space-y-2">
          {outcomes.map((item: any, i: number) => (
            <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
              <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
              {typeof item === "string" ? item : item?.name ?? JSON.stringify(item)}
            </div>
          ))}
        </div>
      );
    },
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
        <div className="space-y-2">
          {ec.map((c: any, i: number) => (
            <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground flex items-center justify-between gap-2">
              <span>
                <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
                {c.criterion_name ?? c.name ?? "—"}
              </span>
              <span className="shrink-0 font-medium text-muted-foreground">{c.weight_percentage ?? c.weight ?? "—"}%</span>
            </div>
          ))}
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
    render: (ch) => {
      if (!ch.ip_model) return <p className="text-sm text-muted-foreground">Not set.</p>;
      return (
        <Badge variant="secondary" className="capitalize">{ch.ip_model.replace(/_/g, " ")}</Badge>
      );
    },
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
    key: "eligibility",
    label: "Eligibility",
    attribution: "by Curator",
    dbField: "eligibility",
    isFilled: (ch) => !!ch.eligibility,
    render: (ch) => {
      if (!ch.eligibility) return <p className="text-sm text-muted-foreground italic">Not configured</p>;
      // Try to parse as array of selected values
      const parsed = parseJson<string[]>(ch.eligibility);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (
          <div className="flex flex-wrap gap-2">
            {parsed.map((v: string) => (
              <Badge key={v} variant="secondary" className="capitalize">{v.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        );
      }
      return <p className="text-sm text-foreground">{ch.eligibility}</p>;
    },
  },
  {
    key: "visibility",
    label: "Visibility",
    attribution: "by Curator",
    dbField: "visibility",
    isFilled: (ch) => !!ch.visibility,
    render: (ch) => {
      if (!ch.visibility) return <p className="text-sm text-muted-foreground italic">Not configured</p>;
      const parsed = parseJson<string[]>(ch.visibility);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return (
          <div className="flex flex-wrap gap-2">
            {parsed.map((v: string) => (
              <Badge key={v} variant="secondary" className="capitalize">{v.replace(/_/g, " ")}</Badge>
            ))}
          </div>
        );
      }
      return <p className="text-sm text-foreground capitalize">{ch.visibility}</p>;
    },
  },
  {
    key: "solver_expertise",
    label: "Solver Expertise Requirements",
    attribution: "by Curator / AI",
    dbField: "solver_expertise_requirements",
    isFilled: (ch) => {
      const data = parseJson<any>(ch.solver_expertise_requirements);
      if (!data) return false;
      return (data.proficiency_areas?.length ?? 0) + (data.sub_domains?.length ?? 0) + (data.specialities?.length ?? 0) > 0;
    },
    render: () => null, // Rendered via SolverExpertiseSection component
  },
  // ── Phase 1 additions: Challenge Settings (Org Policy) ──
  {
    key: "hook",
    label: "Challenge Hook",
    attribution: "AI / Creator",
    dbField: "hook",
    isFilled: (ch) => !!(ch as any).hook?.trim(),
    render: (ch) => <AiContentRenderer content={(ch as any).hook} compact fallback="—" />,
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
    sectionKeys: ["problem_statement", "scope", "deliverables", "expected_outcomes", "submission_guidelines", "maturity_level", "hook"],
  },
  {
    id: "evaluation",
    label: "Evaluation",
    colorDone: "bg-blue-100 text-blue-800 border-blue-300",
    colorActive: "bg-blue-50 border-blue-400",
    colorBorder: "border-blue-200",
    sectionKeys: ["evaluation_criteria", "reward_structure", "complexity"],
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
    sectionKeys: ["phase_schedule", "eligibility", "visibility", "solver_expertise", "submission_deadline", "challenge_visibility", "effort_level"],
  },
  {
    id: "extended_brief",
    label: "Extended Brief",
    colorDone: "bg-emerald-100 text-emerald-800 border-emerald-300",
    colorActive: "bg-emerald-50 border-emerald-400",
    colorBorder: "border-emerald-200",
    sectionKeys: ["extended_brief"],
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
  // Check if this is an extended brief subsection
  const ebField = EXTENDED_BRIEF_FIELD_MAP[sectionKey];
  if (ebField) {
    const eb = parseJson<any>(ch.extended_brief);
    const val = eb?.[ebField];
    if (val == null) return null;
    return typeof val === "string" ? val : JSON.stringify(val);
  }

  switch (sectionKey) {
    case "problem_statement": return ch.problem_statement;
    case "scope": return ch.scope;
    case "submission_guidelines": return ch.description;
    case "ip_model": return ch.ip_model;
    case "eligibility": {
      const solverTypes = parseJson<any>(ch.solver_eligibility_types);
      if (Array.isArray(solverTypes) && solverTypes.length > 0) {
        const codes = solverTypes.map((t: any) => typeof t === "string" ? t : t?.code ?? "");
        return JSON.stringify(codes);
      }
      return ch.eligibility;
    }
    case "visibility": {
      const solverVis = parseJson<any>(ch.solver_visibility_types);
      if (Array.isArray(solverVis) && solverVis.length > 0) {
        const codes = solverVis.map((t: any) => typeof t === "string" ? t : t?.code ?? "");
        return JSON.stringify(codes);
      }
      return ch.visibility;
    }
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
    case "solver_expertise": return ch.solver_expertise_requirements ? JSON.stringify(ch.solver_expertise_requirements) : null;
    case "expected_outcomes": {
      const eb = parseJson<any>(ch.extended_brief);
      return eb?.expected_outcomes ? JSON.stringify(eb.expected_outcomes) : null;
    }
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
  eligibility: "eligibility",
  visibility: "visibility",
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
    isControlledMode(resolveGovernanceMode(challenge.governance_profile))
      ? escrowRecord?.escrow_status === "FUNDED"
      : true,
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

  // Locked section Send to LC/FC modal state
  const [lockedSendState, setLockedSendState] = useState<{
    open: boolean;
    sectionKey: string;
    sectionLabel: string;
    initialComment: string;
    aiOriginalComments: string;
  }>({ open: false, sectionKey: "", sectionLabel: "", initialComment: "", aiOriginalComments: "" });


  // Domain tags editing state (now managed inside TagInputSectionRenderer)

  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ══════════════════════════════════════
  // SECTION 2: Queries
  // ══════════════════════════════════════
  const { data: challenge, isLoading } = useQuery({
    queryKey: ["curation-review", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select("id, title, problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule, complexity_score, complexity_level, complexity_parameters, ip_model, maturity_level, visibility, eligibility, description, operating_model, governance_profile, current_phase, phase_status, domain_tags, ai_section_reviews, currency_code, submission_deadline, challenge_visibility, effort_level, hook, max_solutions, extended_brief, solver_eligibility_types, solver_visibility_types, solver_expertise_requirements")
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

  // Master data for select/checkbox/radio renderers
  const masterData = useCurationMasterData();

  // Section-level curator actions (approvals + modification requests)
  const { data: sectionActions = [] } = useQuery({
    queryKey: ["curator-section-actions", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("curator_section_actions" as any)
        .select("id, section_key, action_type, status, addressed_to, priority, comment_html, created_at, responded_at, response_html")
        .eq("challenge_id", challengeId!)
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as unknown as Array<{
        id: string;
        section_key: string;
        action_type: string;
        status: string;
        addressed_to: string | null;
        priority: string | null;
        comment_html: string | null;
        created_at: string;
        responded_at: string | null;
        response_html: string | null;
      }>;
    },
    enabled: !!challengeId,
    ...CACHE_STANDARD,
  });

  const getSectionActions = useCallback((sectionKey: string) => {
    return sectionActions.filter(a => a.section_key === sectionKey);
  }, [sectionActions]);


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

  /** Approve a locked section (Legal/Escrow) — with audit metadata */
  const handleApproveLockedSection = useCallback(async (sectionKey: string) => {
    if (!user?.id || !challengeId) return;

    // Gather audit metadata
    const aiReviewWasRun = aiReviews.some(r => r.section_key === sectionKey);
    const commentsSentToCoordinator = sectionActions.some(
      a => a.section_key === sectionKey && a.action_type === "modification_request"
    );

    const { error } = await supabase
      .from("curator_section_actions" as any)
      .insert({
        challenge_id: challengeId,
        section_key: sectionKey,
        action_type: "approval",
        status: "approved",
        created_by: user.id,
        comment_html: JSON.stringify({
          ai_review_was_run: aiReviewWasRun,
          comments_sent_to_coordinator: commentsSentToCoordinator,
        }),
      });
    if (error) {
      toast.error(`Failed to approve: ${error.message}`);
    } else {
      toast.success("Section accepted");
      queryClient.invalidateQueries({ queryKey: ["curator-section-actions", challengeId] });
    }
  }, [user?.id, challengeId, queryClient, aiReviews, sectionActions]);

  /** Undo acceptance of a locked section */
  const handleUndoApproval = useCallback(async (sectionKey: string) => {
    if (!challengeId) return;
    // Find the approval record and delete it
    const approvalRecord = sectionActions.find(
      a => a.section_key === sectionKey && a.action_type === "approval" && a.status === "approved"
    );
    if (!approvalRecord) return;

    const { error } = await supabase
      .from("curator_section_actions" as any)
      .delete()
      .eq("id", approvalRecord.id);
    if (error) {
      toast.error(`Failed to undo: ${error.message}`);
    } else {
      toast.success("Acceptance undone");
      queryClient.invalidateQueries({ queryKey: ["curator-section-actions", challengeId] });
    }
  }, [challengeId, queryClient, sectionActions]);

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
        body: { challenge_id: challengeId, role_context: 'curation' },
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

  const handleAcceptRefinement = useCallback(async (sectionKey: string, newContent: string) => {
    const section = SECTION_MAP.get(sectionKey);
    const dbField = section?.dbField;

    // ── Solver expertise: parse JSON and save directly ──
    if (sectionKey === "solver_expertise") {
      try {
        const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[1]);
          setSavingSection(true);
          saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: parsed });
          return;
        }
      } catch { /* fall through */ }
      toast.error("AI returned invalid expertise data. Please try again.");
      return;
    }

    // ── Master-data multi-select sections: save to solver_*_types as {code, label}[] ──
    if (sectionKey === "eligibility") {
      try {
        const codes = JSON.parse(newContent);
        if (Array.isArray(codes)) {
          const typed = codes.map((c: string) => ({
            code: c,
            label: masterData.eligibilityOptions.find(o => o.value === c)?.label ?? c,
          }));
          setSavingSection(true);
          saveSectionMutation.mutate({ field: "solver_eligibility_types", value: typed });
          return;
        }
      } catch { /* not JSON array, fall through */ }
    }
    if (sectionKey === "visibility") {
      try {
        const codes = JSON.parse(newContent);
        if (Array.isArray(codes)) {
          const typed = codes.map((c: string) => ({
            code: c,
            label: masterData.visibilityOptions.find(o => o.value === c)?.label ?? c,
          }));
          setSavingSection(true);
          saveSectionMutation.mutate({ field: "solver_visibility_types", value: typed });
          return;
        }
      } catch { /* not JSON array, fall through */ }
    }

    // ── Single-code master-data sections: validate and save directly ──
    const SINGLE_CODE_MAP: Record<string, { field: string; options: typeof masterData.ipModelOptions }> = {
      ip_model: { field: "ip_model", options: masterData.ipModelOptions },
      maturity_level: { field: "maturity_level", options: masterData.maturityOptions },
      complexity: { field: "complexity_level", options: masterData.complexityOptions },
      challenge_visibility: { field: "challenge_visibility", options: masterData.challengeVisibilityOptions },
      effort_level: { field: "effort_level", options: masterData.effortOptions },
    };
    const singleCodeCfg = SINGLE_CODE_MAP[sectionKey];
    if (singleCodeCfg) {
      const code = newContent.trim().replace(/^["']|["']$/g, '');
      const validCodes = new Set(singleCodeCfg.options.map(o => o.value));
      // Try case-insensitive match
      const matched = singleCodeCfg.options.find(o => o.value.toLowerCase() === code.toLowerCase());
      if (matched) {
        setSavingSection(true);
        saveSectionMutation.mutate({ field: singleCodeCfg.field, value: matched.value });
        return;
      }
      if (!validCodes.has(code)) {
        toast.error(`Invalid ${sectionKey}: "${code}" is not a valid option. Valid: ${Array.from(validCodes).join(", ")}`);
        return;
      }
      setSavingSection(true);
      saveSectionMutation.mutate({ field: singleCodeCfg.field, value: code });
      return;
    }

    if (!dbField) {
      toast.error("Cannot save refinement for this section type.");
      return;
    }

    let valueToSave: any = newContent;

    // ── Structured JSON fields: parse AI output into proper JSON ──
    const JSON_FIELDS = ['deliverables', 'evaluation_criteria', 'phase_schedule', 'reward_structure'];
    if (JSON_FIELDS.includes(dbField)) {
      let cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          valueToSave = JSON.parse(jsonMatch[1]);
        } catch {
          toast.error(`AI returned invalid structured data for ${dbField}. Please try again.`);
          return;
        }
      } else {
        toast.error(`AI did not return structured JSON for ${dbField}. Please try again.`);
        return;
      }
    }

    // ── Text fields: normalize markdown → sanitized HTML ──
    const HTML_TEXT_FIELDS = ['problem_statement', 'scope', 'description', 'hook'];
    if (HTML_TEXT_FIELDS.includes(dbField) && typeof valueToSave === 'string') {
      const { normalizeAiContentForEditor } = await import('@/lib/aiContentFormatter');
      valueToSave = normalizeAiContentForEditor(valueToSave);
    }

    setSavingSection(true);
    saveSectionMutation.mutate({ field: dbField, value: valueToSave });
  }, [saveSectionMutation, masterData]);

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

  /** Accept refinement for extended brief subsections — merge into extended_brief JSONB */
  const handleAcceptExtendedBriefRefinement = useCallback(async (subsectionKey: string, newContent: string) => {
    const jsonbField = EXTENDED_BRIEF_FIELD_MAP[subsectionKey];
    if (!jsonbField) {
      // Not an extended brief subsection — delegate to main handler
      handleAcceptRefinement(subsectionKey, newContent);
      return;
    }

    const currentBrief = parseJson<Record<string, unknown>>(challenge?.extended_brief ?? null) ?? {};
    let valueToSave: unknown = newContent;

    // Parse JSON for structured fields (line_items, table)
    const config = SECTION_FORMAT_CONFIG[subsectionKey];
    if (config && (config.format === 'line_items' || config.format === 'table')) {
      const cleaned = newContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
      const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          valueToSave = JSON.parse(jsonMatch[1]);
        } catch {
          toast.error(`AI returned invalid JSON for ${subsectionKey}. Please try again.`);
          return;
        }
      }
    } else if (config?.format === 'rich_text' && typeof newContent === 'string') {
      const { normalizeAiContentForEditor } = await import('@/lib/aiContentFormatter');
      valueToSave = normalizeAiContentForEditor(newContent);
    }

    const updated = { ...currentBrief, [jsonbField]: valueToSave };
    setSavingSection(true);
    saveSectionMutation.mutate({ field: "extended_brief", value: updated });
  }, [challenge?.extended_brief, saveSectionMutation, handleAcceptRefinement]);

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
      // Special handling for Extended Brief: count 7 subsections instead of 1 parent key
      if (g.id === "extended_brief") {
        const eb = challenge.extended_brief;
        const parsed = typeof eb === "string" ? (() => { try { return JSON.parse(eb); } catch { return null; } })() : eb;
        const subsectionFields = EXTENDED_BRIEF_SUBSECTION_KEYS.map(
          (k) => EXTENDED_BRIEF_FIELD_MAP[k] ?? k
        );
        let done = 0;
        if (parsed && typeof parsed === "object") {
          subsectionFields.forEach((field) => {
            const val = (parsed as Record<string, unknown>)[field];
            if (val != null && val !== "" && !(Array.isArray(val) && val.length === 0)) {
              done++;
            }
          });
        }
        const total = EXTENDED_BRIEF_SUBSECTION_KEYS.length; // 7
        const hasAIFlag = aiQuality?.gaps?.some((gap) => {
          const mapped = GAP_FIELD_TO_SECTION[gap.field] ?? gap.field;
          return EXTENDED_BRIEF_SUBSECTION_KEYS.includes(mapped as any) || mapped === "extended_brief";
        }) ?? false;
        result[g.id] = { done, total, hasAIFlag };
        return;
      }

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
            {activeGroupDef.id !== "extended_brief" && (
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{activeGroupDef.label}</CardTitle>
              </CardHeader>
            )}
            <CardContent className="pt-0">
              <div className="space-y-3">
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
                  const isComplexity = section.key === "complexity";

                  // Compute panel status from AI review
                  let panelStatus: SectionStatus = "not_reviewed";
                  if (isLocked) panelStatus = "view_only";
                  else if (aiReview) {
                    if (aiReview.status === "pass") panelStatus = "pass";
                    else if (aiReview.status === "warning") panelStatus = "warning";
                    else if (aiReview.status === "needs_revision") panelStatus = "needs_revision";
                  }

                  // Domain tag state
                  const currentTags = section.key === "domain_tags"
                    ? (() => { const t = parseJson<string[]>(challenge.domain_tags); return Array.isArray(t) ? t : []; })()
                    : [];

                  // Build section content using format-native renderers
                  const sectionContent = (() => {
                    const cancelEdit = () => setEditingSection(null);

                    switch (section.key) {
                      // ── Rich text sections ──
                      case "problem_statement":
                      case "scope":
                      case "hook":
                        return (
                          <>
                            <RichTextSectionRenderer
                              value={getFieldValue(challenge, section.key)}
                              readOnly={isReadOnly || isLocked}
                              editing={isEditing}
                              onSave={(val) => handleSaveText(section.key, section.dbField!, val)}
                              onCancel={cancelEdit}
                              onEdit={() => setEditingSection(section.key)}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Deliverables (line items) ──
                      case "deliverables":
                        return (
                          <>
                            <LineItemsSectionRenderer
                              items={getDeliverableItems(challenge)}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={handleSaveDeliverables}
                              onCancel={cancelEdit}
                              saving={savingSection}
                              itemLabel="Deliverable"
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Submission guidelines (line items) ──
                      case "submission_guidelines": {
                        const raw = parseJson<any>(challenge.description);
                        const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
                        const lineItems = items.map((item: any) => typeof item === "string" ? item : item?.name ?? "");
                        // If no structured items, treat existing text as single item
                        const finalItems = lineItems.length > 0 ? lineItems : (challenge.description?.trim() ? [challenge.description] : []);
                        return (
                          <>
                            <LineItemsSectionRenderer
                              items={finalItems}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(items) => {
                                setSavingSection(true);
                                saveSectionMutation.mutate({ field: "description", value: { items } });
                              }}
                              onCancel={cancelEdit}
                              saving={savingSection}
                              itemLabel="Guideline"
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );
                      }

                      // ── Expected outcomes (line items) ──
                      case "expected_outcomes": {
                        const eb = parseJson<any>(challenge.extended_brief);
                        const outcomes = Array.isArray(eb?.expected_outcomes) ? eb.expected_outcomes : [];
                        const outcomeItems = outcomes.map((item: any) => typeof item === "string" ? item : item?.name ?? "");
                        return (
                          <>
                            <LineItemsSectionRenderer
                              items={outcomeItems}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(items) => {
                                setSavingSection(true);
                                const currentBrief = parseJson<any>(challenge.extended_brief) ?? {};
                                saveSectionMutation.mutate({ field: "extended_brief", value: { ...currentBrief, expected_outcomes: items } });
                              }}
                              onCancel={cancelEdit}
                              saving={savingSection}
                              itemLabel="Outcome"
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );
                      }

                      // ── IP Model (checkbox single from master data) ──
                      case "ip_model":
                        return (
                          <>
                            <CheckboxSingleSectionRenderer
                              value={challenge.ip_model}
                              options={masterData.ipModelOptions}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(val) => handleSaveOrgPolicyField("ip_model", val)}
                              onCancel={cancelEdit}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Eligibility (checkbox multi from solver tiers) ──
                      case "eligibility": {
                        const solverElig = parseJson<any>(challenge.solver_eligibility_types);
                        const eligValues = Array.isArray(solverElig)
                          ? solverElig.map((t: any) => typeof t === "string" ? t : t?.code ?? "")
                          : [];
                        return (
                          <>
                            <CheckboxMultiSectionRenderer
                              selectedValues={eligValues}
                              options={masterData.eligibilityOptions}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(values) => {
                                setSavingSection(true);
                                saveSectionMutation.mutate({ field: "solver_eligibility_types", value: values.map(v => ({ code: v, label: masterData.eligibilityOptions.find(o => o.value === v)?.label ?? v })) });
                              }}
                              onCancel={cancelEdit}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );
                      }

                      // ── Visibility (checkbox multi from solver tiers) ──
                      case "visibility": {
                        const solverVis = parseJson<any>(challenge.solver_visibility_types);
                        const visValues = Array.isArray(solverVis)
                          ? solverVis.map((t: any) => typeof t === "string" ? t : t?.code ?? "")
                          : [];
                        return (
                          <>
                            <CheckboxMultiSectionRenderer
                              selectedValues={visValues}
                              options={masterData.visibilityOptions}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(values) => {
                                setSavingSection(true);
                                saveSectionMutation.mutate({ field: "solver_visibility_types", value: values.map(v => ({ code: v, label: masterData.visibilityOptions.find(o => o.value === v)?.label ?? v })) });
                              }}
                              onCancel={cancelEdit}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );
                      }
                      // ── Evaluation criteria (table) ──
                      case "evaluation_criteria":
                        return (
                          <>
                            <TableSectionRenderer
                              sectionKey={section.key}
                              rows={getEvalCriteria(challenge)}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={handleSaveEvalCriteria}
                              onCancel={cancelEdit}
                              saving={savingSection}
                              showWeightTotal
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Reward structure (custom component) ──
                      case "reward_structure":
                        return (
                          <RewardStructureDisplay
                            rewardStructure={challenge.reward_structure}
                            currencyCode={challenge.currency_code ?? undefined}
                            challengeId={challenge.id}
                            problemStatement={challenge.problem_statement}
                          />
                        );

                      // ── Complexity (custom component) ──
                      case "complexity":
                        return (
                          <ComplexityAssessmentModule
                            challengeId={challengeId!}
                            currentScore={challenge.complexity_score ?? null}
                            currentLevel={challenge.complexity_level ?? null}
                            currentParams={parseJson<any[]>(challenge.complexity_parameters) ?? null}
                            complexityParams={complexityParams}
                            onSave={handleSaveComplexity}
                            saving={savingSection}
                          />
                        );

                      // ── Maturity level (checkbox single / select) ──
                      case "maturity_level":
                        return (
                          <>
                            <CheckboxSingleSectionRenderer
                              value={challenge.maturity_level}
                              options={masterData.maturityOptions}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(val) => handleSaveMaturityLevel(val)}
                              onCancel={cancelEdit}
                              saving={savingSection}
                              getLabel={getMaturityLabel}
                              getDescription={(val) => masterData.maturityOptions.find(o => o.value === val)?.description}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Phase schedule (schedule table) ──
                      case "phase_schedule":
                        return (
                          <>
                            <ScheduleTableSectionRenderer
                              data={parseJson<any>(challenge.phase_schedule)}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(rows) => {
                                setSavingSection(true);
                                saveSectionMutation.mutate({ field: "phase_schedule", value: rows });
                              }}
                              onCancel={() => setEditingSection(null)}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Legal docs (read-only table) ──
                      case "legal_docs":
                        return <LegalDocsSectionRenderer documents={legalDetails} />;

                      // ── Escrow funding (structured fields, read-only) ──
                      case "escrow_funding":
                        return (
                          <StructuredFieldsSectionRenderer
                            escrow={escrowRecord}
                            isControlledMode={isControlledMode(resolveGovernanceMode(challenge.governance_profile))}
                          />
                        );

                      // ── Domain tags (tag input) ──
                      case "domain_tags":
                        return (
                          <TagInputSectionRenderer
                            tags={currentTags}
                            readOnly={isReadOnly}
                            onAdd={handleAddDomainTag}
                            onRemove={handleRemoveDomainTag}
                          />
                        );

                      // ── Solver expertise requirements ──
                      case "solver_expertise": {
                        const targeting = parseJson<any>(challenge.eligibility);
                        const industrySegId = targeting?.industry_segment_id ?? null;
                        return (
                          <SolverExpertiseSection
                            data={challenge.solver_expertise_requirements}
                            industrySegmentId={industrySegId}
                            readOnly={isReadOnly}
                            onSave={(expertiseData) => {
                              setSavingSection(true);
                              saveSectionMutation.mutate({ field: "solver_expertise_requirements", value: expertiseData });
                            }}
                            saving={savingSection}
                          />
                        );
                      }

                      case "extended_brief":
                        return (
                          <ExtendedBriefDisplay
                            data={challenge.extended_brief}
                            onSave={handleSaveExtendedBrief}
                            saving={savingSection}
                            readOnly={isReadOnly}
                            challengeId={challengeId!}
                            aiSectionReviews={aiReviews}
                            onAcceptRefinement={handleAcceptExtendedBriefRefinement}
                            onSingleSectionReview={handleSingleSectionReview}
                            onMarkAddressed={handleMarkAddressed}
                            challengeContext={challengeCtx}
                          />
                        );

                      // ── Submission deadline (date picker) ──
                      case "submission_deadline":
                        return (
                          <>
                            <DateSectionRenderer
                              value={challenge.submission_deadline}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(val) => handleSaveOrgPolicyField("submission_deadline", val)}
                              onCancel={cancelEdit}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Challenge visibility (select) ──
                      case "challenge_visibility":
                        return (
                          <>
                            <SelectSectionRenderer
                              value={challenge.challenge_visibility}
                              options={masterData.visibilityOptions}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(val) => handleSaveOrgPolicyField("challenge_visibility", val)}
                              onCancel={cancelEdit}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Effort level (radio) ──
                      case "effort_level":
                        return (
                          <>
                            <RadioSectionRenderer
                              value={challenge.effort_level}
                              options={masterData.effortOptions}
                              readOnly={isReadOnly}
                              editing={isEditing}
                              onSave={(val) => handleSaveOrgPolicyField("effort_level", val)}
                              onCancel={cancelEdit}
                              saving={savingSection}
                            />
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );

                      // ── Fallback ──
                      default:
                        return (
                          <>
                            {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
                            {canEdit && !isEditing && (
                              <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setEditingSection(section.key)}>
                                <Pencil className="h-3 w-3 mr-1" />Edit
                              </Button>
                            )}
                          </>
                        );
                    }
                  })();

                  // Resolve masterDataOptions for this section
                  const sectionMasterDataOptions = (() => {
                    switch (section.key) {
                      case "eligibility": return masterData.eligibilityOptions;
                      case "visibility": return masterData.visibilityOptions;
                      case "ip_model": return masterData.ipModelOptions;
                      case "maturity_level": return masterData.maturityOptions;
                      case "complexity": return masterData.complexityOptions;
                      case "challenge_visibility": return masterData.challengeVisibilityOptions;
                      case "effort_level": return masterData.effortOptions;
                      default: return undefined;
                    }
                  })();

                  // Determine coordinator props for locked sections
                  const coordinatorRole = section.key === "legal_docs" ? "LC" as const : section.key === "escrow_funding" ? "FC" as const : undefined;
                  const hasSentBefore = getSectionActions(section.key).some(
                    a => a.action_type === "modification_request"
                  );

                  // Build AI review slot
                  const aiReviewContent = (
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
                      masterDataOptions={sectionMasterDataOptions}
                      isLockedSection={isLocked}
                      coordinatorRole={coordinatorRole}
                      hasSentBefore={hasSentBefore}
                      onSendToCoordinator={isLocked ? (editedComments: string) => {
                        // Store original AI comments for audit
                        const originalAiComments = aiReview?.comments?.join("\n\n") ?? "";
                        setLockedSendState({
                          open: true,
                          sectionKey: section.key,
                          sectionLabel: section.label,
                          initialComment: editedComments,
                          aiOriginalComments: originalAiComments,
                        });
                      } : undefined}
                    />
                  );

                  // Extended brief renders its own nested panels — no outer wrapper needed
                  if (section.key === "extended_brief") {
                    return <React.Fragment key={section.key}>{sectionContent}</React.Fragment>;
                  }

                  return (
                    <CuratorSectionPanel
                      key={section.key}
                      sectionKey={section.key}
                      label={section.label}
                      attribution={section.attribution}
                      filled={filled}
                      status={panelStatus}
                      isLocked={isLocked}
                      isReadOnly={isReadOnly}
                      isApproved={isApproved}
                      onToggleApproval={() => toggleSectionApproval(section.key)}
                      onApproveSection={isLocked ? () => handleApproveLockedSection(section.key) : undefined}
                      onUndoApproval={isLocked ? () => handleUndoApproval(section.key) : undefined}
                      challengeId={challengeId!}
                      inlineFlags={inlineFlags}
                      defaultExpanded={!!(aiReview && !aiReview.addressed && (aiReview.status === 'warning' || aiReview.status === 'needs_revision'))}
                      aiReviewSlot={aiReviewContent}
                      sectionActions={getSectionActions(section.key)}
                      promptSource={aiReview?.prompt_source ?? null}
                    >
                      {sectionContent}
                    </CuratorSectionPanel>
                  );
                })}
              </div>
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

      {/* Send to LC/FC Modal for locked sections */}
      <SendForModificationModal
        open={lockedSendState.open}
        onOpenChange={(open) => setLockedSendState(prev => ({ ...prev, open }))}
        challengeId={challengeId!}
        sectionKey={lockedSendState.sectionKey}
        sectionLabel={lockedSendState.sectionLabel}
        initialComment={lockedSendState.initialComment}
        aiOriginalComments={lockedSendState.aiOriginalComments}
      />
    </div>
  );
}
