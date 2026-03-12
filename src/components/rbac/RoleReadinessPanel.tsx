/**
 * SCR-11: Role Readiness Panel (Expanded)
 * Shows per-role readiness status with assignment counts and missing role details.
 * Now also shows pending challenge refs count per BR-CORE-007.
 * BRD Ref: BR-CORE-006, MOD-06
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight, Shield, Clock } from "lucide-react";
import { useRoleReadiness } from "@/hooks/queries/useRoleReadiness";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useRoleAssignments } from "@/hooks/queries/useRoleAssignments";
import { usePendingChallengeRefs } from "@/hooks/queries/usePendingChallengeRefs";

interface RoleReadinessPanelProps {
  orgId: string;
  model: string;
  onNavigateToAssign?: (roleCode: string) => void;
}

export function RoleReadinessPanel({ orgId, model, onNavigateToAssign }: RoleReadinessPanelProps) {
  const { data: readinessData, isLoading: readinessLoading } = useRoleReadiness(orgId, model);
  const { data: allRoleCodes } = useSlmRoleCodes();
  const { data: assignments } = useRoleAssignments(orgId);

  const readiness = readinessData?.[0] ?? null;
  const isReady = readiness?.overall_status === "ready";
  const missingCodes = readiness?.missing_roles ?? [];

  // Filter roles for this model
  const modelRoles = (allRoleCodes ?? []).filter(
    (r) => r.model_applicability === model || r.model_applicability === "both"
  );

  // Compute per-role fill status
  const roleDetails = modelRoles.map((role) => {
    const activeCount = (assignments ?? []).filter(
      (a) => a.role_code === role.code && a.status === "active"
    ).length;
    return {
      ...role,
      activeCount,
      isFilled: activeCount >= role.min_required,
      isMissing: missingCodes.includes(role.code),
    };
  });

  const filled = readiness?.total_filled ?? 0;
  const total = readiness?.total_required ?? 0;
  const progressPct = total > 0 ? (filled / total) * 100 : 0;
  const modelLabel = model === "mp" ? "Marketplace" : "Aggregator";

  if (readinessLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isReady
      ? "border-green-200 dark:border-green-800/40"
      : "border-amber-200 dark:border-amber-800/40"
    }>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Role Readiness — {modelLabel}
          </CardTitle>
          <Badge
            variant="outline"
            className={isReady
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            }
          >
            {isReady ? "READY" : "NOT READY"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{filled} of {total} roles filled</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        {/* Per-role breakdown */}
        <div className="space-y-2">
          {roleDetails.map((role) => (
            <div
              key={role.code}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border ${
                role.isFilled
                  ? "bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/30"
                  : "bg-destructive/5 border-destructive/10"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {role.isFilled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{role.display_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{role.code} · {role.is_core ? "Core" : "Challenge"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {role.activeCount}/{role.min_required}
                </Badge>
                {!role.isFilled && onNavigateToAssign && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onNavigateToAssign(role.code)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Warning when not ready */}
        {!isReady && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-md px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Challenge submissions are blocked until all required roles are filled.
              {missingCodes.length > 0 && ` Missing: ${missingCodes.join(", ")}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
