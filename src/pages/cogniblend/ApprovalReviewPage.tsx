/**
 * Approval Review Page — /cogni/approval/:id
 *
 * Innovation Director reviews a Phase 4 challenge before publication.
 * Layout:
 *  - Collapsible challenge summary card at top (read-only, same as M-14 left panel)
 *  - Tabbed interface: Overview | Evaluation | Legal | Publication Config
 */

import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Eye,
} from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

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
  max_solutions: number | null;
  submission_deadline: string | null;
}

interface LegalDoc {
  id: string;
  tier: string;
  document_type: string;
  document_name: string | null;
  status: string | null;
  template_version: string | null;
}

interface AmendmentRecord {
  id: string;
  amendment_number: number;
  reason: string | null;
  initiated_by: string | null;
  status: string | null;
  created_at: string;
}

interface EvalCriterion {
  criterion_name: string;
  weight_percentage: number;
}

interface RewardTier {
  tier?: string;
  label?: string;
  amount?: number;
  value?: number;
}

interface PhaseEntry {
  phase?: number;
  phase_number?: number;
  label?: string;
  name?: string;
  duration_days?: number;
  days?: number;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

type TabKey = "overview" | "evaluation" | "legal" | "publication";

const TAB_ITEMS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "evaluation", label: "Evaluation" },
  { key: "legal", label: "Legal" },
  { key: "publication", label: "Publication Config" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Collapsible challenge summary — reuses the M-14 accordion sections pattern (read-only) */
function ChallengeSummaryCard({ challenge }: { challenge: ChallengeData }) {
  const [expanded, setExpanded] = useState(false);

  const sections: { label: string; content: React.ReactNode; filled: boolean }[] = [
    {
      label: "Problem Statement",
      filled: !!challenge.problem_statement?.trim(),
      content: <p className="text-sm text-foreground whitespace-pre-wrap">{challenge.problem_statement || "—"}</p>,
    },
    {
      label: "Scope",
      filled: !!challenge.scope?.trim(),
      content: <p className="text-sm text-foreground whitespace-pre-wrap">{challenge.scope || "—"}</p>,
    },
    {
      label: "Deliverables",
      filled: (() => { const d = parseJson<string[]>(challenge.deliverables); return !!d && d.length > 0; })(),
      content: (() => {
        const d = parseJson<string[]>(challenge.deliverables);
        if (!d || d.length === 0) return <p className="text-sm text-muted-foreground">None defined.</p>;
        return <ol className="list-decimal list-inside space-y-1">{d.map((item, i) => <li key={i} className="text-sm text-foreground">{item}</li>)}</ol>;
      })(),
    },
    {
      label: "Reward Structure",
      filled: (() => { const rs = parseJson<RewardTier[]>(challenge.reward_structure); return !!rs && rs.length > 0; })(),
      content: (() => {
        const rs = parseJson<RewardTier[]>(challenge.reward_structure);
        if (!rs || rs.length === 0) return <p className="text-sm text-muted-foreground">Not defined.</p>;
        return <div className="space-y-2">{rs.map((r, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
            <span className="text-sm font-medium text-foreground">{r.tier ?? r.label ?? `Tier ${i + 1}`}</span>
            <span className="text-sm text-muted-foreground">${(r.amount ?? r.value ?? 0).toLocaleString()}</span>
          </div>
        ))}</div>;
      })(),
    },
    {
      label: "Phase Schedule",
      filled: (() => { const ps = parseJson<PhaseEntry[]>(challenge.phase_schedule); return !!ps && ps.length > 0; })(),
      content: (() => {
        const ps = parseJson<PhaseEntry[]>(challenge.phase_schedule);
        if (!ps || ps.length === 0) return <p className="text-sm text-muted-foreground">Not defined.</p>;
        return (
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Phase</TableHead><TableHead>Name</TableHead><TableHead className="text-right">Duration (days)</TableHead></TableRow></TableHeader>
              <TableBody>{ps.map((p, i) => (
                <TableRow key={i}><TableCell className="text-sm">{p.phase ?? p.phase_number ?? i + 1}</TableCell><TableCell className="text-sm">{p.label ?? p.name ?? "—"}</TableCell><TableCell className="text-sm text-right">{p.duration_days ?? p.days ?? "—"}</TableCell></TableRow>
              ))}</TableBody>
            </Table>
          </div>
        );
      })(),
    },
    {
      label: "IP Model",
      filled: !!challenge.ip_model?.trim(),
      content: <p className="text-sm font-medium text-foreground">{challenge.ip_model || "—"}</p>,
    },
    {
      label: "Visibility & Eligibility",
      filled: !!challenge.visibility || !!challenge.eligibility,
      content: (
        <div className="space-y-2">
          {challenge.visibility && <div><p className="text-xs text-muted-foreground">Visibility</p><p className="text-sm text-foreground capitalize">{challenge.visibility}</p></div>}
          {challenge.eligibility && <div><p className="text-xs text-muted-foreground">Eligibility</p><p className="text-sm text-foreground">{challenge.eligibility}</p></div>}
          {!challenge.visibility && !challenge.eligibility && <p className="text-sm text-muted-foreground">Not configured.</p>}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">Challenge Summary</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-xs">{expanded ? "Collapse" : "Expand"}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {challenge.operating_model && (
            <Badge variant="outline" className="text-[10px] font-semibold">
              {challenge.operating_model.toUpperCase().includes("MARKET") ? "MP" : "AGG"}
            </Badge>
          )}
          {challenge.maturity_level && (
            <Badge variant="secondary" className="text-[10px] capitalize">{challenge.maturity_level}</Badge>
          )}
          {challenge.governance_profile && (
            <Badge variant="outline" className="text-[10px] capitalize">{challenge.governance_profile}</Badge>
          )}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <Accordion type="multiple" defaultValue={["Problem Statement"]} className="w-full">
            {sections.map((s) => (
              <AccordionItem key={s.label} value={s.label}>
                <AccordionTrigger className="text-sm font-medium hover:no-underline gap-2">
                  <div className="flex items-center gap-2 flex-1 text-left">
                    {s.filled ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                    <span>{s.label}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-6">{s.content}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}

/** Overview Tab */
function OverviewTab({ challenge, amendments }: { challenge: ChallengeData; amendments: AmendmentRecord[] }) {
  // Checklist result bar
  const checklistLabels = [
    "Problem Statement", "Scope", "Deliverables", "Evaluation Weights = 100%",
    "Reward Structure", "Phase Schedule", "Submission Guidelines", "Eligibility",
    "Taxonomy Tags", "Tier 1 Legal Docs", "Tier 2 Legal Docs",
    "Complexity Parameters", "Maturity Level", "Artifact Types",
  ];

  const ec = parseJson<EvalCriterion[]>(challenge.evaluation_criteria);
  const evalSum = ec?.reduce((s, c) => s + (c.weight_percentage ?? 0), 0) ?? 0;

  const autoChecks = [
    !!challenge.problem_statement?.trim(),
    !!challenge.scope?.trim(),
    (() => { const d = parseJson<unknown[]>(challenge.deliverables); return !!d && d.length > 0; })(),
    evalSum === 100,
    (() => { const rs = parseJson<unknown[]>(challenge.reward_structure); return !!rs && rs.length > 0; })(),
    (() => { const ps = parseJson<unknown[]>(challenge.phase_schedule); return !!ps && ps.length > 0; })(),
    !!challenge.description?.trim(),
    !!challenge.eligibility?.trim(),
    false, // taxonomy tags
    false, // tier 1 (simplified — full check requires legal docs query)
    false, // tier 2
    challenge.complexity_score != null,
    !!challenge.maturity_level,
    false, // artifact types
  ];

  const passedCount = autoChecks.filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Curator's Checklist Result */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Curator's Checklist Result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${passedCount === 14 ? "bg-green-600" : passedCount >= 10 ? "bg-amber-500" : "bg-destructive"}`}
                style={{ width: `${Math.round((passedCount / 14) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-foreground">{passedCount}/14</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            {checklistLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                {autoChecks[i]
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                }
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Complexity Score & Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Complexity Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {challenge.complexity_score != null && (
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{challenge.complexity_score}</p>
                <p className="text-xs text-muted-foreground">Score</p>
              </div>
            )}
            {challenge.complexity_level && (
              <Badge variant="secondary" className="capitalize text-sm">
                {challenge.complexity_level}
              </Badge>
            )}
            {!challenge.complexity_score && !challenge.complexity_level && (
              <p className="text-sm text-muted-foreground">Not assessed.</p>
            )}
          </div>
          {(() => {
            const params = parseJson<ComplexityParam[]>(challenge.complexity_parameters);
            if (!params || params.length === 0) return null;
            return (
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {params.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.name ?? p.key ?? `Param ${i + 1}`}</span>
                    <span className="font-medium text-foreground">{p.value ?? p.score ?? "—"}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Modification History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Modification History</CardTitle>
        </CardHeader>
        <CardContent>
          {amendments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No modifications recorded. Clean pass from curation.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Initiated By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amendments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm font-medium">{a.amendment_number} of 3</TableCell>
                      <TableCell className="text-sm capitalize">{a.initiated_by || "—"}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{a.reason || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "INITIATED" ? "secondary" : "outline"} className="text-[10px]">
                          {a.status || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(a.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Evaluation Tab */
function EvaluationTab({ challenge }: { challenge: ChallengeData }) {
  const criteria = parseJson<EvalCriterion[]>(challenge.evaluation_criteria) ?? [];
  const totalWeight = criteria.reduce((s, c) => s + (c.weight_percentage ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Criteria Table (read-only) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Evaluation Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          {criteria.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evaluation criteria defined.</p>
          ) : (
            <>
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Criterion</TableHead>
                      <TableHead className="text-right">Weight %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criteria.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-sm font-medium">{c.criterion_name}</TableCell>
                        <TableCell className="text-sm text-right font-semibold">{c.weight_percentage}%</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-border">
                      <TableCell />
                      <TableCell className="text-sm font-bold">Total</TableCell>
                      <TableCell className={`text-sm text-right font-bold ${totalWeight === 100 ? "text-green-600" : "text-destructive"}`}>
                        {totalWeight}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              {totalWeight !== 100 && (
                <p className="text-xs text-destructive mt-2">⚠ Weights do not sum to 100%. This must be corrected before publication.</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Reviewer Form Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Reviewer Evaluation Form Preview</CardTitle>
          <p className="text-xs text-muted-foreground">This is how the evaluation form will appear to expert reviewers.</p>
        </CardHeader>
        <CardContent>
          {criteria.length === 0 ? (
            <p className="text-sm text-muted-foreground">No criteria to preview.</p>
          ) : (
            <div className="space-y-4">
              {criteria.map((c, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{c.criterion_name}</h4>
                    <Badge variant="outline" className="text-[10px]">{c.weight_percentage}% weight</Badge>
                  </div>
                  {/* Score scale preview */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <div
                        key={n}
                        className="h-8 w-8 rounded border border-border flex items-center justify-center text-xs text-muted-foreground"
                      >
                        {n}
                      </div>
                    ))}
                  </div>
                  <div className="h-16 rounded border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                    Commentary text area
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Legal Tab */
function LegalTab({ challengeId, legalDocs }: { challengeId: string; legalDocs: LegalDoc[] }) {
  const [previewDoc, setPreviewDoc] = useState<LegalDoc | null>(null);

  const tier1 = legalDocs.filter((d) => d.tier === "TIER_1");
  const tier2 = legalDocs.filter((d) => d.tier === "TIER_2");

  function statusBadge(status: string | null) {
    switch (status?.toLowerCase()) {
      case "attached":
      case "default_applied":
      case "custom_uploaded":
        return <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 border-green-200">Attached</Badge>;
      case "triggered":
        return <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">Triggered</Badge>;
      case "signed":
        return <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">Signed</Badge>;
      case "expired":
        return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status || "Unknown"}</Badge>;
    }
  }

  function renderTierSection(title: string, docs: LegalDoc[]) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents in this tier.</p>
          ) : (
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <button
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          {doc.document_name || doc.document_type}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{doc.document_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{doc.template_version || "—"}</TableCell>
                      <TableCell>{statusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewDoc(doc)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {renderTierSection("Tier 1: Entry-Phase Documents", tier1)}
        {renderTierSection("Tier 2: Solution-Phase Documents", tier2)}
      </div>

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{previewDoc?.document_name || previewDoc?.document_type}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{previewDoc?.tier === "TIER_1" ? "Tier 1" : "Tier 2"}</Badge>
              <Badge variant="outline" className="text-[10px]">{previewDoc?.document_type}</Badge>
              {previewDoc?.template_version && (
                <Badge variant="outline" className="text-[10px]">v{previewDoc.template_version}</Badge>
              )}
              {previewDoc && statusBadge(previewDoc.status)}
            </div>
            <div className="rounded border border-dashed border-border p-6 flex flex-col items-center justify-center text-center min-h-[200px] text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">Document Preview</p>
              <p className="text-xs mt-1">
                Full document preview will be available when file storage integration is connected.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Publication Config Tab — delegates to ApprovalPublicationConfigTab */
// Imported inline below to avoid modifying header imports

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ApprovalReviewPage() {
  // ══════════════════════════════════════
  // SECTION 1: State & hooks
  // ══════════════════════════════════════
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ══════════════════════════════════════
  // SECTION 2: Query — challenge data
  // ══════════════════════════════════════
  const { data: challenge, isLoading } = useQuery({
    queryKey: ["approval-review", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(
          "id, title, problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule, complexity_score, complexity_level, complexity_parameters, ip_model, maturity_level, visibility, eligibility, description, operating_model, governance_profile, current_phase, max_solutions, submission_deadline"
        )
        .eq("id", challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data as ChallengeData;
    },
    enabled: !!challengeId,
  });

  // ══════════════════════════════════════
  // SECTION 3: Query — legal documents
  // ══════════════════════════════════════
  const { data: legalDocs = [] } = useQuery({
    queryKey: ["approval-legal-docs", challengeId],
    queryFn: async (): Promise<LegalDoc[]> => {
      const { data, error } = await supabase
        .from("challenge_legal_docs")
        .select("id, tier, document_type, document_name, status, template_version")
        .eq("challenge_id", challengeId!)
        .order("tier")
        .order("document_type");
      if (error) return [];
      return (data ?? []) as LegalDoc[];
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  // ══════════════════════════════════════
  // SECTION 4: Query — amendment records
  // ══════════════════════════════════════
  const { data: amendments = [] } = useQuery({
    queryKey: ["approval-amendments", challengeId],
    queryFn: async (): Promise<AmendmentRecord[]> => {
      const { data, error } = await supabase
        .from("amendment_records")
        .select("id, amendment_number, reason, initiated_by, status, created_at")
        .eq("challenge_id", challengeId!)
        .order("amendment_number", { ascending: true });
      if (error) return [];
      return (data ?? []) as AmendmentRecord[];
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  // ══════════════════════════════════════
  // SECTION 5: Conditional returns
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Challenge not found.
      </div>
    );
  }

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/cogni/approval")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">Approval Review</h1>
          <p className="text-sm text-muted-foreground truncate">{challenge.title}</p>
        </div>
        <Badge variant="outline" className="text-[10px] ml-auto shrink-0">
          Phase {challenge.current_phase ?? 4}
        </Badge>
      </div>

      {/* Collapsible Challenge Summary */}
      <ChallengeSummaryCard challenge={challenge} />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && <OverviewTab challenge={challenge} amendments={amendments} />}
        {activeTab === "evaluation" && <EvaluationTab challenge={challenge} />}
        {activeTab === "legal" && <LegalTab challengeId={challengeId!} legalDocs={legalDocs} />}
        {activeTab === "publication" && <PublicationConfigTab challenge={challenge} />}
      </div>
    </div>
  );
}
