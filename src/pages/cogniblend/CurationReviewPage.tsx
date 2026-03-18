/**
 * Curation Review Page — /cogni/curation/:id
 *
 * Two-panel layout for curators to review challenge completeness:
 *  - LEFT (60%): Collapsible accordion sections showing all challenge content
 *  - RIGHT (40%): Completeness checklist with status indicators
 * Mobile: stacked (content first, checklist below).
 */

import { useMemo } from "react";
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
  ArrowLeft,
  CheckCircle2,
  XCircle,
  FileText,
  Shield,
  AlertTriangle,
} from "lucide-react";
import CurationChecklistPanel from "./CurationChecklistPanel";
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
  phase_status: string | null;
}

interface LegalDocSummary {
  tier: string;
  total: number;
  attached: number;
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
// Section definitions
// ---------------------------------------------------------------------------

interface SectionDef {
  key: string;
  label: string;
  isFilled: (ch: ChallengeData, legalDocs: LegalDocSummary[]) => boolean;
  render: (ch: ChallengeData, legalDocs: LegalDocSummary[]) => React.ReactNode;
}

function parseJson<T>(val: Json | null): T | null {
  if (!val) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return null;
    }
  }
  return val as T;
}

const SECTIONS: SectionDef[] = [
  {
    key: "problem_statement",
    label: "Problem Statement",
    isFilled: (ch) => !!ch.problem_statement?.trim(),
    render: (ch) => (
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {ch.problem_statement || "—"}
      </p>
    ),
  },
  {
    key: "scope",
    label: "Scope",
    isFilled: (ch) => !!ch.scope?.trim(),
    render: (ch) => (
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {ch.scope || "—"}
      </p>
    ),
  },
  {
    key: "deliverables",
    label: "Deliverables",
    isFilled: (ch) => {
      const d = parseJson<string[]>(ch.deliverables);
      return !!d && d.length > 0;
    },
    render: (ch) => {
      const d = parseJson<string[]>(ch.deliverables);
      if (!d || d.length === 0)
        return <p className="text-sm text-muted-foreground">None defined.</p>;
      return (
        <ol className="list-decimal list-inside space-y-1">
          {d.map((item, i) => (
            <li key={i} className="text-sm text-foreground">
              {item}
            </li>
          ))}
        </ol>
      );
    },
  },
  {
    key: "evaluation_criteria",
    label: "Evaluation Criteria",
    isFilled: (ch) => {
      const ec = parseJson<EvalCriterion[]>(ch.evaluation_criteria);
      return !!ec && ec.length > 0;
    },
    render: (ch) => {
      const ec = parseJson<EvalCriterion[]>(ch.evaluation_criteria);
      if (!ec || ec.length === 0)
        return <p className="text-sm text-muted-foreground">Not defined.</p>;
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
              {ec.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{c.criterion_name}</TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {c.weight_percentage}%
                  </TableCell>
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
    isFilled: (ch) => {
      const rs = parseJson<RewardTier[]>(ch.reward_structure);
      return !!rs && rs.length > 0;
    },
    render: (ch) => {
      const rs = parseJson<RewardTier[]>(ch.reward_structure);
      if (!rs || rs.length === 0)
        return <p className="text-sm text-muted-foreground">Not defined.</p>;
      return (
        <div className="space-y-2">
          {rs.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0"
            >
              <span className="text-sm font-medium text-foreground">
                {r.tier ?? r.label ?? `Tier ${i + 1}`}
              </span>
              <span className="text-sm text-muted-foreground">
                ${(r.amount ?? r.value ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "phase_schedule",
    label: "Phase Schedule",
    isFilled: (ch) => {
      const ps = parseJson<PhaseEntry[]>(ch.phase_schedule);
      return !!ps && ps.length > 0;
    },
    render: (ch) => {
      const ps = parseJson<PhaseEntry[]>(ch.phase_schedule);
      if (!ps || ps.length === 0)
        return <p className="text-sm text-muted-foreground">Not defined.</p>;
      return (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Duration (days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ps.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">
                    {p.phase ?? p.phase_number ?? i + 1}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.label ?? p.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    {p.duration_days ?? p.days ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    },
  },
  {
    key: "complexity",
    label: "Complexity Assessment",
    isFilled: (ch) => ch.complexity_score != null || !!ch.complexity_level,
    render: (ch) => {
      const params = parseJson<ComplexityParam[]>(ch.complexity_parameters);
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {ch.complexity_score != null && (
              <span className="text-sm text-foreground">
                Score: <span className="font-semibold">{ch.complexity_score}</span>
              </span>
            )}
            {ch.complexity_level && (
              <Badge variant="secondary" className="text-xs capitalize">
                {ch.complexity_level}
              </Badge>
            )}
          </div>
          {params && params.length > 0 && (
            <div className="space-y-1">
              {params.map((p, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs text-muted-foreground"
                >
                  <span>{p.name ?? p.key ?? `Param ${i + 1}`}</span>
                  <span className="font-medium text-foreground">
                    {p.value ?? p.score ?? "—"}
                  </span>
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
    isFilled: (ch) => !!ch.ip_model?.trim(),
    render: (ch) => (
      <div>
        <p className="text-sm font-medium text-foreground">
          {ch.ip_model || "—"}
        </p>
      </div>
    ),
  },
  {
    key: "domain_tags",
    label: "Domain Tags",
    isFilled: () => false, // Tags are in a separate junction table; we'll show placeholder
    render: () => (
      <p className="text-sm text-muted-foreground italic">
        Domain tags will be loaded from challenge taxonomy mappings.
      </p>
    ),
  },
  {
    key: "submission_guidelines",
    label: "Submission Guidelines",
    isFilled: (ch) => !!ch.description?.trim(), // description used as guidelines field
    render: (ch) => (
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {ch.description || "—"}
      </p>
    ),
  },
  {
    key: "legal_docs",
    label: "Legal Documents",
    isFilled: (_ch, legalDocs) =>
      legalDocs.length > 0 && legalDocs.every((d) => d.attached === d.total),
    render: (_ch, legalDocs) => {
      if (legalDocs.length === 0)
        return <p className="text-sm text-muted-foreground">No legal documents found.</p>;
      return (
        <div className="space-y-2">
          {legalDocs.map((d) => (
            <div
              key={d.tier}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-foreground">{d.tier}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {d.attached} / {d.total} attached
                </span>
                {d.attached === d.total ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px]"
                  >
                    Complete
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">
                    Incomplete
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "maturity_level",
    label: "Maturity Level",
    isFilled: (ch) => !!ch.maturity_level,
    render: (ch) =>
      ch.maturity_level ? (
        <Badge variant="secondary" className="capitalize">
          {ch.maturity_level}
        </Badge>
      ) : (
        <p className="text-sm text-muted-foreground">Not set.</p>
      ),
  },
  {
    key: "artifact_types",
    label: "Artifact Types",
    isFilled: () => false, // Future: permitted_artifact_types
    render: () => (
      <p className="text-sm text-muted-foreground italic">
        Artifact types derived from maturity level configuration.
      </p>
    ),
  },
  {
    key: "visibility_eligibility",
    label: "Visibility & Eligibility",
    isFilled: (ch) => !!ch.visibility || !!ch.eligibility,
    render: (ch) => {
      if (!ch.visibility && !ch.eligibility)
        return (
          <p className="text-sm text-muted-foreground italic">
            Not yet configured
          </p>
        );
      return (
        <div className="space-y-2">
          {ch.visibility && (
            <div>
              <p className="text-xs text-muted-foreground">Visibility</p>
              <p className="text-sm text-foreground capitalize">
                {ch.visibility}
              </p>
            </div>
          )}
          {ch.eligibility && (
            <div>
              <p className="text-xs text-muted-foreground">Eligibility</p>
              <p className="text-sm text-foreground">{ch.eligibility}</p>
            </div>
          )}
        </div>
      );
    },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurationReviewPage() {
  // ══════════════════════════════════════
  // SECTION 1: Hooks
  // ══════════════════════════════════════
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ══════════════════════════════════════
  // SECTION 2: Query — challenge data
  // ══════════════════════════════════════
  const { data: challenge, isLoading } = useQuery({
    queryKey: ["curation-review", challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenges")
        .select(
          "id, title, problem_statement, scope, deliverables, evaluation_criteria, reward_structure, phase_schedule, complexity_score, complexity_level, complexity_parameters, ip_model, maturity_level, visibility, eligibility, description, operating_model, governance_profile, current_phase, phase_status"
        )
        .eq("id", challengeId!)
        .single();
      if (error) throw new Error(error.message);
      return data as ChallengeData;
    },
    enabled: !!challengeId,
  });

  // ══════════════════════════════════════
  // SECTION 3: Query — legal doc summary
  // ══════════════════════════════════════
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
          attached: ofTier.filter(
            (r) => r.status === "default_applied" || r.status === "custom_uploaded"
          ).length,
        };
      });
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  // ══════════════════════════════════════
  // SECTION 4: Computed checklist
  // ══════════════════════════════════════
  const checklist = useMemo(() => {
    if (!challenge) return [];
    return SECTIONS.map((s) => ({
      key: s.key,
      label: s.label,
      filled: s.isFilled(challenge, legalDocs),
    }));
  }, [challenge, legalDocs]);

  const filledCount = checklist.filter((c) => c.filled).length;
  const totalCount = checklist.length;

  // ══════════════════════════════════════
  // SECTION 5: Conditional returns
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-7 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
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

  const isLegalPending = challenge.phase_status === 'LEGAL_VERIFICATION_PENDING';

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
          onClick={() => navigate("/cogni/curation")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">
            Curation Review
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            {challenge.title}
          </p>
        </div>
        {challenge.governance_profile && (
          <Badge variant="outline" className="text-[10px] ml-auto shrink-0 capitalize">
            {challenge.governance_profile}
          </Badge>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT PANEL — 60% (3/5) */}
        <div className="lg:col-span-3 space-y-0">
          <Accordion type="multiple" defaultValue={["problem_statement"]} className="w-full">
            {SECTIONS.map((section) => {
              const filled = section.isFilled(challenge, legalDocs);
              return (
                <AccordionItem key={section.key} value={section.key}>
                  <AccordionTrigger className="text-sm font-medium hover:no-underline gap-2">
                    <div className="flex items-center gap-2 flex-1 text-left">
                      {filled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <span>{section.label}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-6">
                    {section.render(challenge, legalDocs)}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* RIGHT PANEL — 40% (2/5) */}
        <div className="lg:col-span-2">
          <CurationChecklistPanel
            challengeId={challengeId!}
            challenge={challenge}
            legalDocs={legalDocs}
          />
        </div>
      </div>
    </div>
  );
}
