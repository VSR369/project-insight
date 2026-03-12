/**
 * MsmeToggle — MSME/Small Team Mode switch
 * Purple themed card, Active/Off badge, dynamic role codes, Quick Assign button
 */

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Users } from "lucide-react";
import { useMsmeConfig, useToggleMsmeConfig } from "@/hooks/queries/useMsmeConfig";
import { useSlmRoleCodes } from "@/hooks/queries/useSlmRoleCodes";

interface MsmeToggleProps {
  orgId: string;
  onQuickAssign: () => void;
}

export function MsmeToggle({ orgId, onQuickAssign }: MsmeToggleProps) {
  const { data: config } = useMsmeConfig(orgId);
  const toggleMsme = useToggleMsmeConfig();
  const { data: allRoles } = useSlmRoleCodes();

  const isEnabled = config?.is_enabled ?? false;

  // Get applicable role codes for display
  const applicableRoleCodes = allRoles
    ?.filter((r) => r.model_applicability === "agg" || r.model_applicability === "both")
    .map((r) => r.code) ?? [];
  const roleCodesDisplay = applicableRoleCodes.join(", ");

  const handleToggle = (checked: boolean) => {
    toggleMsme.mutate({ orgId, isEnabled: checked });
  };

  return (
    <Card className={isEnabled
      ? "border-purple-400/60 bg-purple-50/50 dark:bg-purple-950/20"
      : ""
    }>
      <CardContent className="py-4 px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isEnabled ? "bg-purple-100 dark:bg-purple-900/40" : "bg-muted"}`}>
              <Users className={`h-4 w-4 ${isEnabled ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  MSME / Small Team Mode
                </span>
                {isEnabled ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-0 text-[10px] px-1.5 py-0">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Off
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow one person to hold all aggregator roles
                {roleCodesDisplay && (
                  <span className="text-muted-foreground/70"> ({roleCodesDisplay})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isEnabled && (
              <Button
                variant="default"
                size="sm"
                onClick={onQuickAssign}
                className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Quick Assign All</span>
                <span className="lg:hidden">Assign</span>
              </Button>
            )}
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={toggleMsme.isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
