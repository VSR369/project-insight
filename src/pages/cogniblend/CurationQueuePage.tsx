/**
 * Curation Queue Page — /cogni/curation
 *
 * Lists challenges assigned to the Curator (CU role).
 * Phase 2 challenges appear as "Incoming" (read-only, awaiting LC/FC).
 * Phase 3 challenges are "Ready for Review" (full curation access).
 * Filter tabs: Awaiting Review | Incoming | Under Revision | All.
 */

import { useMemo, useState } from "react";
import { MATURITY_LABELS as MATURITY_LABEL_MAP } from "@/lib/maturityLabels";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
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
import { CheckSquare, Clock, FileCheck } from "lucide-react";
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

interface EnrichedCurationChallenge extends CurationChallenge {
  sla: SlaStatus | null;
  modificationCycle: string;
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
  if (phase === 1) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] font-semibold gap-1">
        <Clock className="h-3 w-3" />
        Spec in Progress
      </Badge>
    );
  }
  if (phase === 2) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-semibold gap-1">
        <Clock className="h-3 w-3" />
        Awaiting Legal
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] font-semibold gap-1">
      <FileCheck className="h-3 w-3" />
      Ready for Review
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CurationQueuePage() {
  // ══════════════════════════════════════
  // SECTION 1: State & hooks
  // ══════════════════════════════════════
  const [activeTab, setActiveTab] = useState<FilterTab | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // ══════════════════════════════════════
  // SECTION 2: Permission check
  // ══════════════════════════════════════
  const { data: hasPermission, isLoading: permLoading } = useQuery({
    queryKey: ["curation-permission", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_challenge_roles")
        .select("challenge_id")
        .eq("user_id", user!.id)
        .eq("role_code", "CU")
        .eq("is_active", true)
        .limit(1);
      if (error) return false;
      return (data ?? []).length > 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // ══════════════════════════════════════
  // SECTION 3: Query — curation queue challenges (Phase 2 + 3)
  // ══════════════════════════════════════
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["curation-queue", user?.id],
    queryFn: async (): Promise<EnrichedCurationChallenge[]> => {
      if (!user?.id) return [];

      // Step 1: Get challenge IDs where user holds active CU role
      const { data: cuRoles, error: rolesError } = await supabase
        .from("user_challenge_roles")
        .select("challenge_id")
        .eq("user_id", user.id)
        .eq("role_code", "CU")
        .eq("is_active", true);

      if (rolesError) throw new Error(rolesError.message);
      const cuChallengeIds = (cuRoles ?? []).map((r) => r.challenge_id);
      if (cuChallengeIds.length === 0) return [];

      // Step 2: Fetch challenges at phase 2 or 3
      const { data: rows, error } = await supabase
        .from("challenges")
        .select(
          "id, title, operating_model, maturity_level, created_at, current_phase, phase_status, organization_id"
        )
        .in("id", cuChallengeIds)
        .in("current_phase", [1, 2, 3])
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) return [];

      // Enrich with SLA status in parallel
      const enriched = await Promise.all(
        (rows as CurationChallenge[]).map(async (ch) => {
          // Only fetch SLA for Phase 3 challenges
          let sla: SlaStatus | null = null;
          if (ch.current_phase === 3) {
            const slaRes = await supabase.rpc("check_sla_status", {
              p_challenge_id: ch.id,
              p_phase: 3,
            });
            sla = slaRes.error
              ? null
              : ((typeof slaRes.data === "string"
                  ? JSON.parse(slaRes.data)
                  : slaRes.data) as SlaStatus | null);
          }

          return {
            ...ch,
            sla,
            modificationCycle: "Cycle 1 of 3",
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
    const incoming = challenges.filter((c) => c.current_phase === 1 || c.current_phase === 2).length;
    const revision = challenges.filter(
      (c) => c.current_phase === 3 && c.sla?.status === "BREACHED"
    ).length;
    const awaiting = challenges.filter(
      (c) => c.current_phase === 3 && c.sla?.status !== "BREACHED"
    ).length;
    return { awaiting, incoming, revision, all: challenges.length };
  }, [challenges]);

  // Smart default: show "All" if no phase 3 challenges exist yet
  const resolvedTab = useMemo<FilterTab>(() => {
    if (activeTab !== null) return activeTab;
    return tabCounts.awaiting > 0 ? "awaiting" : "all";
  }, [activeTab, tabCounts.awaiting]);

  const filtered = useMemo(() => {
    if (resolvedTab === "all") return challenges;
    if (resolvedTab === "incoming") {
      return challenges.filter((c) => c.current_phase === 1 || c.current_phase === 2);
    }
    if (resolvedTab === "revision") {
      return challenges.filter(
        (c) => c.current_phase === 3 && c.sla?.status === "BREACHED"
      );
    }
    // "awaiting" — phase 3, non-breached
    return challenges.filter(
      (c) => c.current_phase === 3 && c.sla?.status !== "BREACHED"
    );
  }, [challenges, resolvedTab]);

  // ══════════════════════════════════════
  // SECTION 5: Conditional returns
  // ══════════════════════════════════════
  if (isLoading || permLoading) {
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

  if (!hasPermission) {
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
      <h1 className="text-[22px] font-bold text-foreground">Curation Queue</h1>

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
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <CheckSquare className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-medium text-muted-foreground">
            {activeTab === "incoming"
              ? "No incoming challenges"
              : "No challenges awaiting curation"}
          </p>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            {activeTab === "incoming"
              ? "Challenges will appear here once you're assigned as Curator, while Legal and Finance complete their review."
              : "Challenges submitted for review will appear here."}
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Challenge Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operating Model</TableHead>
                <TableHead>Maturity Level</TableHead>
                <TableHead>Modification Cycle</TableHead>
                <TableHead>SLA Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ch) => {
                const isIncoming = ch.current_phase === 2;
                return (
                  <TableRow
                    key={ch.id}
                    className={`${
                      isIncoming
                        ? "opacity-75 cursor-default"
                        : "cursor-pointer hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      if (isIncoming) return;
                      handleRowClick(ch);
                    }}
                  >
                    <TableCell>
                      {isIncoming ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-medium text-muted-foreground">
                              {ch.title}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              This challenge is awaiting Legal & Finance review.
                              You'll be able to curate it once it advances to
                              Phase 3.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="link"
                          className="p-0 h-auto text-sm font-medium text-primary hover:underline text-left whitespace-normal"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(ch);
                          }}
                        >
                          {ch.title}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{phaseBadge(ch.current_phase)}</TableCell>
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
