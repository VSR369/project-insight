/**
 * ChallengeRequestorToggle — Org-level toggle for Challenge Requestor (R10_CR) role
 * When enabled, R10_CR appears in Core Roles tab for assignment
 */

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { useMsmeConfig, useToggleChallengeRequestor } from "@/hooks/queries/useMsmeConfig";

interface ChallengeRequestorToggleProps {
  orgId: string;
}

export function ChallengeRequestorToggle({ orgId }: ChallengeRequestorToggleProps) {
  const { data: config } = useMsmeConfig(orgId);
  const toggleCR = useToggleChallengeRequestor();

  const isEnabled = config?.challenge_requestor_enabled ?? false;

  const handleToggle = (checked: boolean) => {
    toggleCR.mutate({ orgId, isEnabled: checked });
  };

  return (
    <Card className={isEnabled
      ? "border-blue-400/60 bg-blue-50/50 dark:bg-blue-950/20"
      : ""
    }>
      <CardContent className="py-4 px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isEnabled ? "bg-blue-100 dark:bg-blue-900/40" : "bg-muted"}`}>
              <ClipboardList className={`h-4 w-4 ${isEnabled ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  Challenge Requestor Role
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
                Allow department users to submit solution requests for Challenge Creator (R4) review
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={toggleCR.isPending}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
