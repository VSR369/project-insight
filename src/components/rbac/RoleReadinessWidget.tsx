/**
 * RoleReadinessWidget — SCR-08: Progress ring + missing roles + contact card
 * Matches screenshot: full dashed red border, XCircle icon, role badges with code
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { XCircle, CheckCircle2, Mail, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRoleReadiness, type RoleReadiness } from "@/hooks/queries/useRoleReadiness";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";
import { useAdminContact } from "@/hooks/queries/useAdminContact";

interface RoleReadinessWidgetProps {
  orgId: string;
  model: string;
}

export function RoleReadinessWidget({ orgId, model }: RoleReadinessWidgetProps) {
  const navigate = useNavigate();
  const { data: readinessData, isLoading: readinessLoading } = useRoleReadiness(orgId, model);
  const { data: roleCodes } = useSlmRoleCodes();
  const { data: adminContact } = useAdminContact();

  const readiness: RoleReadiness | null = readinessData?.[0] ?? null;
  const isReady = readiness?.overall_status === "ready";
  const filled = readiness?.total_filled ?? 0;
  const total = readiness?.total_required ?? 0;
  const missingCodes = readiness?.missing_roles ?? [];

  // Resolve missing role codes to display names + codes from master data
  const missingRoleDetails = missingCodes
    .map((code) => {
      const role = roleCodes?.find((r) => r.code === code);
      return role ? { display_name: role.display_name, code: role.code } : { display_name: code, code };
    });

  // Progress ring SVG values
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? (filled / total) * 100 : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const modelLabel = model === "mp" ? "MP" : "AGG";

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
    <Card className={isReady
      ? "border-2 border-dashed border-green-400"
      : "border-2 border-dashed border-destructive/40"
    }>
      <CardContent className="py-5 px-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Progress Ring */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50" cy="50" r={radius}
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50" cy="50" r={radius}
                  stroke={isReady ? "hsl(142 76% 36%)" : "hsl(var(--destructive))"}
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
          </div>

          {/* Center: Status + Missing Roles */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isReady ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <h3 className={`text-sm font-semibold ${isReady ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                {isReady
                  ? "READY — All roles filled"
                  : `NOT READY — ${missingCodes.length} role${missingCodes.length !== 1 ? "s" : ""} missing`}
              </h3>
            </div>

            {missingRoleDetails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {missingRoleDetails.map((role) => (
                  <Badge
                    key={role.code}
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20 text-xs"
                  >
                    {role.display_name} ({role.code})
                  </Badge>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate("/org/role-readiness")}
              className="text-xs text-primary hover:underline mt-3 font-medium"
            >
              View full readiness details &gt;
            </button>
          </div>

          {/* Right: Admin Contact Card */}
          {adminContact && !isReady && (
            <div className="border rounded-lg p-4 bg-muted/30 min-w-[220px] shrink-0">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Contact for role gap queries ({modelLabel} model)
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground font-medium">{adminContact.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{adminContact.email}</span>
                </div>
                {adminContact.phone_intl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
