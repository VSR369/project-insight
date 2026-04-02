/**
 * Curation Review Page — Section & Group Definitions
 *
 * Extracted from CurationReviewPage.tsx (Phase D1.1).
 * Pure configuration arrays — SECTIONS and GROUPS — plus lookup helpers.
 *
 * NOTE: This file is ~680 lines because the SECTIONS data array is 622 lines
 * of pure config that cannot be split without restructuring. This is acceptable
 * as a data/config file with no business logic.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { AiContentRenderer } from "@/components/ui/AiContentRenderer";
import { DeliverableCardRenderer } from "@/components/cogniblend/curation/renderers";
import RewardStructureDisplay from "@/components/cogniblend/curation/RewardStructureDisplay";
import { getMaturityLabel } from "@/lib/maturityLabels";
import { resolveGovernanceMode, isControlledMode } from "@/lib/governanceMode";
import { parseJson, getDeliverableObjects, getExpectedOutcomeObjects, getSubmissionGuidelineObjects } from "./curationHelpers";
import type { SectionDef, GroupDef, ChallengeData, LegalDocSummary, LegalDocDetail, EscrowRecord } from "./curationTypes";

// ---------------------------------------------------------------------------
// LcStatusBadge — tiny component used in legal_docs section render
// ---------------------------------------------------------------------------

export function LcStatusBadge({ status }: { status: string | null }) {
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
// Constants
// ---------------------------------------------------------------------------

export const LOCKED_SECTIONS = new Set(["legal_docs", "escrow_funding"]);
export const TEXT_SECTIONS = new Set(["problem_statement", "scope", "hook"]);

// ---------------------------------------------------------------------------
// SECTIONS array
// ---------------------------------------------------------------------------

export const SECTIONS: SectionDef[] = [
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
      const items = getDeliverableObjects(ch);
      if (items.length === 0) return <p className="text-sm text-muted-foreground">None defined.</p>;
      return <DeliverableCardRenderer items={items} badgePrefix="D" />;
    },
  },
  {
    key: "submission_guidelines",
    label: "Submission Guidelines",
    attribution: "by CA",
    dbField: "submission_guidelines",
    isFilled: (ch) => {
      const raw = parseJson<any>((ch as any).submission_guidelines);
      const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
      if (items && items.length > 0) return true;
      // Fallback: check legacy description field
      return !!ch.description?.trim();
    },
    render: (ch) => {
      const items = getSubmissionGuidelineObjects(ch);
      if (items.length === 0) return <AiContentRenderer content={ch.description} compact fallback="—" />;
      return <DeliverableCardRenderer items={items} badgePrefix="S" hideAcceptanceCriteria />;
    },
  },
  {
    key: "expected_outcomes",
    label: "Expected Outcomes",
    attribution: "by CA",
    dbField: "expected_outcomes",
    isFilled: (ch) => {
      const eo = parseJson<any>(ch.expected_outcomes);
      const items = Array.isArray(eo) ? eo : (eo?.items ?? []);
      return Array.isArray(items) && items.length > 0;
    },
    render: (ch) => {
      const items = getExpectedOutcomeObjects(ch);
      if (items.length === 0) return <p className="text-sm text-muted-foreground">None defined.</p>;
      return <DeliverableCardRenderer items={items} badgePrefix="O" />;
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
    key: "solution_type",
    label: "Solution Type",
    attribution: "by Curator",
    dbField: "solution_types",
    isFilled: (ch) => {
      const st = (ch as any).solution_types;
      return Array.isArray(st) && st.length > 0;
    },
    render: (ch) => {
      const st = (ch as any).solution_types;
      if (!Array.isArray(st) || st.length === 0) return <p className="text-sm text-muted-foreground italic">Not set</p>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {st.map((code: string) => (
            <Badge key={code} variant="secondary" className="capitalize text-xs">
              {code.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    key: "complexity",
    label: "Complexity Assessment",
    attribution: "by Curator",
    isFilled: (ch) => ch.complexity_score != null || !!ch.complexity_level,
    render: () => null, // Rendered via ComplexityAssessmentModule component
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
        operatingModel={ch.operating_model}
        challengeTitle={ch.title}
      />
    ),
  },
  {
    key: "ip_model",
    label: "IP Model",
    attribution: "by Curator",
    dbField: "ip_model",
    isFilled: (ch) => !!ch.ip_model?.trim(),
    render: (ch) => {
      if (!ch.ip_model) return <p className="text-sm text-muted-foreground">Not set.</p>;
      const IP_LABELS: Record<string, { label: string; desc: string }> = {
        "IP-EA": { label: "Exclusive Assignment", desc: "All intellectual property transfers to the challenge seeker" },
        "IP-NEL": { label: "Non-Exclusive License", desc: "Solver retains ownership, grants license to seeker" },
        "IP-EL": { label: "Exclusive License", desc: "Solver grants exclusive license to seeker" },
        "IP-JO": { label: "Joint Ownership", desc: "Joint ownership between solver and seeker" },
        "IP-NONE": { label: "No IP Transfer", desc: "Solver retains full IP ownership" },
      };
      const ipInfo = IP_LABELS[ch.ip_model];
      return (
        <div className="space-y-1">
          <Badge variant="secondary">{ipInfo?.label ?? ch.ip_model}</Badge>
          {ipInfo?.desc && <p className="text-xs text-muted-foreground">{ipInfo.desc}</p>}
        </div>
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
    key: "context_and_background",
    label: "Context & Background",
    attribution: "from Intake",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.context_background;
      return typeof val === "string" && val.trim().length > 0;
    },
    render: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.context_background;
      if (typeof val === 'string' && val.trim().length > 0) {
        const truncated = val.length > 150 ? val.substring(0, 150) + '…' : val;
        return <p className="text-sm text-muted-foreground line-clamp-3">{truncated}</p>;
      }
      return <p className="text-sm text-muted-foreground">Not available yet.</p>;
    },
  },
  {
    key: "root_causes",
    label: "Root Causes",
    attribution: "AI Inferred",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.root_causes;
      return Array.isArray(val) && val.length > 0;
    },
    render: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const items = Array.isArray(eb?.root_causes) ? eb.root_causes : [];
      if (items.length === 0) return <p className="text-sm text-muted-foreground">Not inferred yet.</p>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 5).map((item: any, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">{typeof item === 'string' ? item : item?.name ?? '—'}</Badge>
          ))}
          {items.length > 5 && <Badge variant="secondary" className="text-xs">+{items.length - 5} more</Badge>}
        </div>
      );
    },
  },
  {
    key: "affected_stakeholders",
    label: "Affected Stakeholders",
    attribution: "AI Inferred",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.affected_stakeholders;
      return Array.isArray(val) && val.length > 0;
    },
    render: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const rows = Array.isArray(eb?.affected_stakeholders) ? eb.affected_stakeholders : [];
      if (rows.length === 0) return <p className="text-sm text-muted-foreground">Not inferred yet.</p>;
      return <p className="text-sm text-muted-foreground">{rows.length} stakeholder(s) identified</p>;
    },
  },
  {
    key: "current_deficiencies",
    label: "Current Deficiencies",
    attribution: "AI Inferred",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.current_deficiencies;
      return Array.isArray(val) && val.length > 0;
    },
    render: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const items = Array.isArray(eb?.current_deficiencies) ? eb.current_deficiencies : [];
      if (items.length === 0) return <p className="text-sm text-muted-foreground">Not inferred yet.</p>;
      return <p className="text-sm text-muted-foreground">{items.length} deficiency observation(s)</p>;
    },
  },
  {
    key: "preferred_approach",
    label: "Preferred Approach",
    attribution: "Human Input",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.preferred_approach;
      if (typeof val === "string") return val.trim().length > 0;
      return Array.isArray(val) && val.length > 0;
    },
    render: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.preferred_approach;
      const items = Array.isArray(val) ? val : (typeof val === 'string' && val.trim() ? [val] : []);
      if (items.length === 0) return <p className="text-sm text-muted-foreground">Not specified yet.</p>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 4).map((item: any, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">{typeof item === 'string' ? item : item?.name ?? '—'}</Badge>
          ))}
          {items.length > 4 && <Badge variant="secondary" className="text-xs">+{items.length - 4} more</Badge>}
        </div>
      );
    },
  },
  {
    key: "approaches_not_of_interest",
    label: "Approaches NOT of Interest",
    attribution: "Human Input",
    dbField: "extended_brief",
    isFilled: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const val = eb?.approaches_not_of_interest;
      return Array.isArray(val) && val.length > 0;
    },
    render: (ch) => {
      const eb = parseJson<any>(ch.extended_brief);
      const items = Array.isArray(eb?.approaches_not_of_interest) ? eb.approaches_not_of_interest : [];
      if (items.length === 0) return <p className="text-sm text-muted-foreground">Not specified yet.</p>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.slice(0, 4).map((item: any, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">{typeof item === 'string' ? item : item?.name ?? '—'}</Badge>
          ))}
          {items.length > 4 && <Badge variant="secondary" className="text-xs">+{items.length - 4} more</Badge>}
        </div>
      );
    },
  },
  // ── New Phase 7 sections ──
  {
    key: "data_resources_provided",
    label: "Data & Resources Provided",
    attribution: "by CA / Curator",
    dbField: "data_resources_provided",
    isFilled: (ch) => {
      const raw = parseJson<any>((ch as any).data_resources_provided);
      return Array.isArray(raw) && raw.length > 0;
    },
    render: (ch) => {
      const raw = parseJson<any[]>((ch as any).data_resources_provided);
      if (!raw || raw.length === 0) return <p className="text-sm text-muted-foreground">No data or resources listed.</p>;
      return (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Format</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Restrictions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {raw.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{r.resource ?? r.name ?? r.resource_name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.type ?? r.data_type ?? r.resource_type ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.format ?? r.data_format ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.size ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.access_method ?? r.access ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.restrictions ?? r.restriction ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    },
  },
  {
    key: "success_metrics_kpis",
    label: "Success Metrics & KPIs",
    attribution: "by CA / Curator",
    dbField: "success_metrics_kpis",
    isFilled: (ch) => {
      const raw = parseJson<any>((ch as any).success_metrics_kpis);
      return Array.isArray(raw) && raw.length > 0;
    },
    render: (ch) => {
      const raw = parseJson<any[]>((ch as any).success_metrics_kpis);
      if (!raw || raw.length === 0) return <p className="text-sm text-muted-foreground">No KPIs defined.</p>;
      return (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KPI</TableHead>
                <TableHead>Baseline</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Timeframe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {raw.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm font-medium">{r.kpi ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.baseline ?? "N/A"}</TableCell>
                  <TableCell className="text-sm">{r.target ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.measurement_method ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.timeframe ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// GROUPS array
// ---------------------------------------------------------------------------

export const GROUPS: GroupDef[] = [
  {
    id: "organization",
    label: "0. Organization",
    icon: "🏢",
    colorDone: "bg-purple-100 text-purple-800 border-purple-300",
    colorActive: "bg-purple-50 border-purple-400",
    colorBorder: "border-purple-200",
    sectionKeys: [],
    prerequisiteGroups: [],
  },
  {
    id: "foundation",
    label: "1. Foundation",
    icon: "🏗️",
    colorDone: "bg-emerald-100 text-emerald-800 border-emerald-300",
    colorActive: "bg-emerald-50 border-emerald-400",
    colorBorder: "border-emerald-200",
    sectionKeys: ["problem_statement", "scope", "expected_outcomes", "context_and_background"],
    prerequisiteGroups: [],
  },
  {
    id: "analysis",
    label: "2. Analysis",
    icon: "🔍",
    colorDone: "bg-teal-100 text-teal-800 border-teal-300",
    colorActive: "bg-teal-50 border-teal-400",
    colorBorder: "border-teal-200",
    sectionKeys: ["root_causes", "affected_stakeholders", "current_deficiencies", "preferred_approach", "approaches_not_of_interest"],
    prerequisiteGroups: ["foundation"],
  },
  {
    id: "specification",
    label: "3. Specification",
    icon: "📋",
    colorDone: "bg-blue-100 text-blue-800 border-blue-300",
    colorActive: "bg-blue-50 border-blue-400",
    colorBorder: "border-blue-200",
    sectionKeys: ["solution_type", "deliverables", "maturity_level", "data_resources_provided", "success_metrics_kpis"],
    prerequisiteGroups: ["foundation"],
  },
  {
    id: "assessment",
    label: "4. Assessment",
    icon: "⚖️",
    colorDone: "bg-slate-100 text-slate-700 border-slate-300",
    colorActive: "bg-slate-50 border-slate-400",
    colorBorder: "border-slate-200",
    sectionKeys: ["complexity", "solver_expertise", "eligibility"],
    prerequisiteGroups: ["specification"],
  },
  {
    id: "execution",
    label: "5. Execution",
    icon: "⚡",
    colorDone: "bg-amber-100 text-amber-800 border-amber-300",
    colorActive: "bg-amber-50 border-amber-400",
    colorBorder: "border-amber-200",
    sectionKeys: ["phase_schedule", "evaluation_criteria", "submission_guidelines", "reward_structure", "ip_model"],
    prerequisiteGroups: ["specification", "assessment"],
  },
  {
    id: "presentation",
    label: "6. Publish",
    icon: "🚀",
    colorDone: "bg-violet-100 text-violet-800 border-violet-300",
    colorActive: "bg-violet-50 border-violet-400",
    colorBorder: "border-violet-200",
    sectionKeys: ["hook", "visibility", "domain_tags", "legal_docs", "escrow_funding"],
    prerequisiteGroups: ["execution"],
  },
];

// ---------------------------------------------------------------------------
// Lookup
// ---------------------------------------------------------------------------

export const SECTION_MAP = new Map(SECTIONS.map((s) => [s.key, s]));
