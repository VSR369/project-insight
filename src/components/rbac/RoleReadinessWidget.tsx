/**
 * RoleReadinessWidget — Progress ring + missing roles + contact card
 * All data from role_readiness_cache and md_slm_role_codes master data
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Phone, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleReadiness, type RoleReadiness } from "@/hooks/queries/useRoleReadiness";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useAdminContact } from "@/hooks/queries/useAdminContact";

interface RoleReadinessWidgetProps {
  orgId: string;
  model: string;
}

export function RoleReadinessWidget({ orgId, model }: RoleReadinessWidgetProps) {
  const { data: readinessData, isLoading: readinessLoading } = useRoleReadiness(orgId, model);
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: adminContact } = useAdminContact();

  const readiness: RoleReadiness | null = readinessData?.[0] ?? null;
  const isReady = readiness?.overall_status === "ready";
  const filled = readiness?.total_filled ?? 0;
  const total = readiness?.total_required ?? 0;
  const missingCodes = readiness?.missing_roles ?? [];

  // Resolve missing role codes to display names from master data
  const missingRoleNames = missingCodes
    .map((code) => roleCodes?.find((r) => r.code === code)?.display_name ?? code)
    .filter(Boolean);

  // Progress ring SVG values
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? (filled / total) * 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (readinessLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-l-4",
      isReady ? "border-l-green-500" : "border-l-destructive"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isReady ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
          <span className={isReady ? "text-green-700 dark:text-green-400" : "text-destructive"}>
            {isReady ? "READY" : "NOT READY"} — {isReady ? "All roles filled" : `${missingCodes.length} role${missingCodes.length !== 1 ? "s" : ""} missing`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Progress Ring */}
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={radius}
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50" cy="50" r={radius}
                  stroke={isReady ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">{filled}/{total}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Roles Filled</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {model === "mp" ? "Marketplace" : "Aggregator"} Model
              </p>
            </div>
          </div>

          {/* Missing Roles */}
          {missingRoleNames.length > 0 && (
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Missing Roles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {missingRoleNames.map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20 text-xs"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Admin Contact Card */}
          {adminContact && !isReady && (
            <div className="border rounded-lg p-3 bg-muted/30 min-w-[200px]">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Contact for Role Queries
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{adminContact.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-foreground">{adminContact.email}</span>
                </div>
                {adminContact.phone_intl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground">{adminContact.phone_intl}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
