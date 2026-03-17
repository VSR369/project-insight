/**
 * Approval Queue Page — /cogni/approval
 *
 * Lists challenges awaiting Innovation Director approval (Phase 4).
 * Mirrors the Curation Queue layout with filter tabs.
 * Columns: Title, Model, Maturity, Complexity Badge, SLA, Submitted by Curator.
 */

import { useMemo, useState } from "react";
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
import { ShieldCheck } from "lucide-react";
import type { SlaStatus } from "@/hooks/cogniblend/useCogniDashboard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApprovalChallenge {
  id: string;
  title: string;
  operating_model: string | null;
  maturity_level: string | null;
  complexity_level: string | null;
  complexity_score: number | null;
  created_at: string;
  current_phase: number | null;
  phase_status: string | null;
  organization_id: string;
}

interface EnrichedApprovalChallenge extends ApprovalChallenge {
  sla: SlaStatus | null;
  curatorName: string;
}

type FilterTab = "awaiting" | "revision" | "all";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { key: FilterTab; label: string }[] = [
  { key: "awaiting", label: "Awaiting Approval" },
  { key: "revision", label: "SLA Breached" },
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

function modelBadge(model: string | null) {
  if (!model) return null;
  const short = model.toUpperCase().includes("MARKET") ? "MP" : "AGG";
  return (
    <Badge variant="outline" className="text-[10px] font-semibold tracking-wide">
      {short}
    </Badge>
  );
}

function maturityBadge(level: string | null) {
  if (!level) return null;
  return (
    <Badge variant="secondary" className="text-[10px] capitalize">
      {level}
    </Badge>
  );
}

function complexityBadge(level: string | null, score: number | null) {
  if (!level && score == null) return <span className="text-xs text-muted-foreground">—</span>;

  const colorMap: Record<string, string> = {
    low: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-amber-100 text-amber-800 border-amber-200",
    high: "bg-red-100 text-red-800 border-red-200",
  };

  const colorClass = level ? colorMap[level.toLowerCase()] ?? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${colorClass}`}>
      {level && <span className="capitalize">{level}</span>}
      {score != null && <span>({score})</span>}
    </span>
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

export default function ApprovalQueuePage() {
  // ══════════════════════════════════════
  // SECTION 1: State & hooks
  // ══════════════════════════════════════
  const [activeTab, setActiveTab] = useState<FilterTab>("awaiting");
  const navigate = useNavigate();
  const { user } = useAuth();

  // ══════════════════════════════════════
  // SECTION 2: Permission check — ID role
  // ══════════════════════════════════════
  const { data: hasPermission, isLoading: permLoading } = useQuery({
    queryKey: ["approval-permission", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_role_assignments" as any)
        .select("id")
        .eq("pool_member_id", user!.id)
        .eq("role_code", "ID")
        .eq("status", "ACTIVE")
        .limit(1);
      if (error) return false;
      return (data ?? []).length > 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // ══════════════════════════════════════
  // SECTION 3: Query — approval queue challenges (Phase 4)
  // ══════════════════════════════════════
  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["approval-queue", user?.id],
    queryFn: async (): Promise<EnrichedApprovalChallenge[]> => {
      if (!user?.id) return [];

      // Fetch Phase 4 challenges
      const { data: rows, error } = await supabase
        .from("challenges")
        .select(
          "id, title, operating_model, maturity_level, complexity_level, complexity_score, created_at, current_phase, phase_status, organization_id"
        )
        .eq("current_phase", 4)
        .eq("phase_status", "ACTIVE")
        .eq("is_deleted", false)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw new Error(error.message);
      if (!rows || rows.length === 0) return [];

      // Enrich with SLA + curator name in parallel
      const enriched = await Promise.all(
        (rows as ApprovalChallenge[]).map(async (ch) => {
          // SLA
          const slaRes = await supabase.rpc("check_sla_status", {
            p_challenge_id: ch.id,
            p_phase: 4,
          });
          const sla = slaRes.error
            ? null
            : ((typeof slaRes.data === "string"
                ? JSON.parse(slaRes.data)
                : slaRes.data) as SlaStatus | null);

          // Curator who submitted (last audit entry for CURATION_SUBMITTED)
          let curatorName = "—";
          const { data: auditRows } = await supabase
            .from("audit_trail")
            .select("user_id")
            .eq("challenge_id", ch.id)
            .eq("action", "CURATION_SUBMITTED")
            .order("created_at", { ascending: false })
            .limit(1);

          if (auditRows && auditRows.length > 0) {
            const { data: profile } = await supabase
              .from("profiles" as any)
              .select("full_name, email")
              .eq("id", auditRows[0].user_id)
              .maybeSingle();
            if (profile) {
              curatorName = (profile as any).full_name || (profile as any).email || "Unknown";
            }
          }

          return {
            ...ch,
            sla,
            curatorName,
          } satisfies EnrichedApprovalChallenge;
        })
      );

      return enriched;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // ══════════════════════════════════════
  // SECTION 4: Filtered data
  // ══════════════════════════════════════
  const filtered = useMemo(() => {
    if (activeTab === "all") return challenges;
    if (activeTab === "revision") {
      return challenges.filter((c) => c.sla?.status === "BREACHED");
    }
    return challenges.filter((c) => c.sla?.status !== "BREACHED");
  }, [challenges, activeTab]);

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
        You do not have the Innovation Director (ID) role required to access this page.
      </div>
    );
  }

  // ══════════════════════════════════════
  // SECTION 6: Render
  // ══════════════════════════════════════
  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* Page title */}
      <h1 className="text-[22px] font-bold text-foreground">Approval Queue</h1>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((tab) => (
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

      {/* Table or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-base font-medium text-muted-foreground">
            No challenges awaiting approval
          </p>
          <p className="text-sm text-muted-foreground/70 max-w-sm">
            Challenges submitted by curators for Innovation Director review will appear here.
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Challenge Title</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Maturity</TableHead>
                <TableHead>Complexity</TableHead>
                <TableHead>SLA Status</TableHead>
                <TableHead>Submitted by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ch) => (
                <TableRow
                  key={ch.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/cogni/approval/${ch.id}`)}
                >
                  <TableCell>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-sm font-medium text-primary hover:underline text-left whitespace-normal"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/cogni/approval/${ch.id}`);
                      }}
                    >
                      {ch.title}
                    </Button>
                  </TableCell>
                  <TableCell>{modelBadge(ch.operating_model)}</TableCell>
                  <TableCell>{maturityBadge(ch.maturity_level)}</TableCell>
                  <TableCell>{complexityBadge(ch.complexity_level, ch.complexity_score)}</TableCell>
                  <TableCell>{slaIndicator(ch.sla)}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {ch.curatorName}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
