/**
 * Curation Queue Page — /cogni/curation
 *
 * Shows ALL active challenges (phases 1-3) within the curator's organization.
 * Access restricted to users holding at least one active CU role.
 * All challenges open in full edit mode; submission gated by governance rules.
 * Includes assignment indicators (Assigned to Me / Other / Unassigned).
 */

import { useMemo, useState, useDeferredValue } from "react";
import { MATURITY_LABELS as MATURITY_LABEL_MAP } from "@/lib/maturityLabels";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCogniPermissions } from "@/hooks/cogniblend/useCogniPermissions";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentOrg } from "@/hooks/queries/useCurrentOrg";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, CheckSquare, Clock, Eye, FileCheck, User, Search } from "lucide-react";
import type { SlaStatus } from "@/hooks/cogniblend/useCogniDashboard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CurationChallenge {
  id: string;
  title: string;
  operating_model: string | null;
  maturity_level: string | null;
  created_at: string;
  current_phase: number | null;
  phase_status: string | null;
  organization_id: string;
}

interface CuAssignment {
  challenge_id: string;
  user_id: string;
  user_name: string | null;
}

interface EnrichedCurationChallenge extends CurationChallenge {
  sla: SlaStatus | null;
  modificationCycle: string;
  assignmentLabel: "mine" | "other" | "unassigned";
  assigneeName: string | null;
}

type FilterTab = "awaiting" | "incoming" | "revision" | "all";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { key: FilterTab; label: string }[] = [
  { key: "awaiting", label: "Awaiting Review" },
  { key: "incoming", label: "Incoming" },
  { key: "revision", label: "Under Revision" },
  { key: "all", label: "All" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slaIndicator(sla: SlaStatus | null) {
  if (!sla) return <span className="text-xs text-muted-foreground">—</span>;

  const dotColor =
    sla.status === "ON_TRACK"
      ? "bg-green-500"
      : sla.status === "APPROACHING"
      ? "bg-amber-500"
      : "bg-red-500";

  const label =
    sla.status === "BREACHED"
      ? `${sla.days_overdue ?? 0}d overdue`
      : `${sla.days_remaining ?? 0}d remaining`;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function phaseBadge(phase: number | null) {
  if (phase === 2) {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] font-semibold gap-1">
        <FileCheck className="h-3 w-3" />
        Awaiting Curation
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-border text-[10px] font-semibold gap-1">
      <Clock className="h-3 w-3" />
      Phase {phase ?? '?'}
    </Badge>
  );
}

function modelBadge(model: string | null) {
  if (!model) return null;
  const short = model.toUpperCase().includes("MARKET") ? "MP" : "AGG";
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-semibold tracking-wide"
    >
      {short}
    </Badge>
  );
}

function maturityBadge(level: string | null) {
  if (!level) return null;
  return (
    <Badge variant="secondary" className="text-[10px]">
      {MATURITY_LABEL_MAP[level] ?? level}
    </Badge>
  );
}

function assignmentBadge(label: "mine" | "other" | "unassigned", name: string | null) {
  if (label === "mine") {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold gap-1">
        <User className="h-3 w-3" />
        Assigned to Me
      </Badge>
    );
  }
  if (label === "other") {
    return (
      <Badge variant="secondary" className="text-[10px] font-semibold gap-1">
        <User className="h-3 w-3" />
        {name ?? "Other"}
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-semibold">
      Unassigned
    </Badge>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} · ${time}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurationQueuePage() {
  // ══════════════════════════════════════
  // SECTION 1: State & hooks
  // ══════════════════════════════════════
  const [activeTab, setActiveTab] = useState<FilterTab | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: currentOrg } = useCurrentOrg();
  const organizationId = currentOrg?.organizationId;

  // ══════════════════════════════════════
  // SECTION 2: Permission check — platform-level CU capability
  // ══════════════════════════════════════
  const { canSeeCurationQueue } = useCogniPermissions();

  // ══════════════════════════════════════
  // SECTION 3: Query — Assignment-based inbox for CU challenges
  // ══════════════════════════════════════
  const { data: challenges = [], isLoading, error: queryError } = useQuery<EnrichedCurationChallenge[]>({
    queryKey: ["curation-queue", user?.id],
    queryFn: async (): Promise<EnrichedCurationChallenge[]> => {
      if (!user?.id) return [];

      // Step 1: Get challenge IDs where this user has active CU assignment
      const { data: myAssignments, error: assignErr } = await supabase
        .from("user_challenge_roles")
        .select("challenge_id")
        .eq("user_id", user.id)
        .eq("role_code", "CU")
        .eq("is_active", true);

      if (assignErr) throw new Error(assignErr.message);

      const assignedIds = (myAssignments ?? []).map((r) => r.challenge_id);

      // Step 2: Also include same-org challenges for preview (if org context exists)
      let orgChallengeIds: string[] = [];
      if (organizationId) {
        const { data: orgRows } = await supabase
          .from("challenges")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("current_phase", 2)
          .eq("is_deleted", false)
          .eq("is_active", true);
        orgChallengeIds = (orgRows ?? []).map((r) => r.id);
      }

      // Merge & dedupe
      const allIds = [...new Set([...assignedIds, ...orgChallengeIds])];
      if (allIds.length === 0) return [];

      // Step 3: Fetch full challenge details for merged IDs
      const { data: rows, error } = await supabase
        .from("challenges")
        .select(
          "id, title, operating_model, maturity_level, created_at, current_phase, phase_status, organization_id"
        )
        .in("id", allIds.slice(0, 50))
        .eq("current_phase", 2)
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) return [];

      // Step 4: Fetch CU role assignments for these challenges to show assignment indicators
      const challengeIds = rows.map((r) => r.id);
      const { data: cuAssignments } = await supabase
        .from("user_challenge_roles")
        .select("challenge_id, user_id")
        .in("challenge_id", challengeIds)
        .eq("role_code", "CU")
        .eq("is_active", true);

      const assignmentMap = new Map<string, CuAssignment[]>();
      if (cuAssignments) {
        for (const a of cuAssignments) {
          const list = assignmentMap.get(a.challenge_id) ?? [];
          list.push({ challenge_id: a.challenge_id, user_id: a.user_id, user_name: null });
          assignmentMap.set(a.challenge_id, list);
        }
      }

      // Step 5: Enrich with SLA status + assignment label
      const enriched = await Promise.all(
        (rows as CurationChallenge[]).map(async (ch) => {
          let sla: SlaStatus | null = null;
          if (ch.current_phase === 2) {
            const slaRes = await supabase.rpc("check_sla_status", {
              p_challenge_id: ch.id,
              p_phase: 2,
            });
            sla = slaRes.error
              ? null
              : ((typeof slaRes.data === "string"
                  ? JSON.parse(slaRes.data)
                  : slaRes.data) as SlaStatus | null);
          }

          const assignments = assignmentMap.get(ch.id) ?? [];
          let assignmentLabel: "mine" | "other" | "unassigned" = "unassigned";
          let assigneeName: string | null = null;
          if (assignments.length > 0) {
            const isMine = assignments.some((a) => a.user_id === user!.id);
            if (isMine) {
              assignmentLabel = "mine";
            } else {
              assignmentLabel = "other";
              assigneeName = "Another Curator";
            }
          }

          return {
            ...ch,
            sla,
            modificationCycle: "Cycle 1 of 3",
            assignmentLabel,
            assigneeName,
          } satisfies EnrichedCurationChallenge;
        })
      );

      return enriched;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // ══════════════════════════════════════
  // SECTION 4: Filtered data + tab counts
  // ══════════════════════════════════════
  const tabCounts = useMemo(() => {
    const awaiting = challenges.filter(
      (c) => c.current_phase === 2 && c.sla?.status !== "BREACHED"
    ).length;
    const incoming = 0; // Phase 2 only — no "incoming" vs "awaiting" distinction needed
    const revision = challenges.filter(
      (c) => c.current_phase === 2 && c.sla?.status === "BREACHED"
    ).length;
    return { awaiting, incoming, revision, all: challenges.length };
  }, [challenges]);

  // Smart default: show "All" if no phase 3 challenges exist yet
  const resolvedTab = useMemo<FilterTab>(() => {
    if (activeTab !== null) return activeTab;
    return tabCounts.awaiting > 0 ? "awaiting" : "all";
  }, [activeTab, tabCounts.awaiting]);

  const filtered = useMemo(() => {
    let list = challenges;
    if (resolvedTab === "incoming") {
      // All Phase 2 challenges
    } else if (resolvedTab === "revision") {
      list = list.filter((c) => c.current_phase === 2 && c.sla?.status === "BREACHED");
    } else if (resolvedTab === "awaiting") {
      list = list.filter((c) => c.current_phase === 2 && c.sla?.status !== "BREACHED");
    }
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    return list;
  }, [challenges, resolvedTab, deferredSearch]);

  // ══════════════════════════════════════
  // SECTION 5: Conditional returns
  // ══════════════════════════════════════
  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-10 w-80" />
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!canSeeCurationQueue) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        You do not have the Curator (CU) role required to access this page.
      </div>
    );
  }

  // ══════════════════════════════════════
  // SECTION 6: Handlers
  // ══════════════════════════════════════
  const handleRowClick = (ch: EnrichedCurationChallenge) => {
    navigate(`/cogni/curation/${ch.id}`);
  };

  // ══════════════════════════════════════
  // SECTION 7: Render
  // ══════════════════════════════════════
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Page title */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <h1 className="text-[22px] font-bold text-foreground">Curation Queue</h1>
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search challenges..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-base"
          />
        </div>
      </div>

      {/* Filter tabs with counts */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => {
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
                resolvedTab === tab.key
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-[10px] font-semibold ${
                    resolvedTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
              {resolvedTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Table or empty state */}
      {/* Error state */}
      {queryError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <AlertCircle className="h-12 w-12 text-destructive/40" />
          <p className="text-base font-medium text-destructive">
            Could not load curation queue
          </p>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            {(queryError as Error).message}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <CheckSquare className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-medium text-muted-foreground">
            No challenges in your curation inbox
          </p>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            Challenges assigned to you for curation review will appear here.
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Challenge Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Operating Model</TableHead>
                <TableHead>Maturity Level</TableHead>
                <TableHead>Modification Cycle</TableHead>
                <TableHead>SLA Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ch) => {
                const isIncoming = false; // All challenges are Phase 2 (Curation)
                const tooltipText = ch.current_phase === 2
                  ? "This challenge is awaiting curation review."
                  : undefined;
                return (
                  <TableRow
                    key={ch.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(ch)}
                  >
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="link"
                            className={`p-0 h-auto text-sm font-medium hover:underline text-left whitespace-normal ${
                              isIncoming ? "text-muted-foreground" : "text-primary"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(ch);
                            }}
                          >
                            {isIncoming && <Eye className="h-3.5 w-3.5 mr-1 inline shrink-0" />}
                            {ch.title}
                          </Button>
                        </TooltipTrigger>
                        {tooltipText && (
                          <TooltipContent>
                            <p className="text-xs">{tooltipText}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell>{phaseBadge(ch.current_phase)}</TableCell>
                    <TableCell>{assignmentBadge(ch.assignmentLabel, ch.assigneeName)}</TableCell>
                    <TableCell>{modelBadge(ch.operating_model)}</TableCell>
                    <TableCell>{maturityBadge(ch.maturity_level)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {isIncoming ? "—" : ch.modificationCycle}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isIncoming ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        slaIndicator(ch.sla)
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(ch.created_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
