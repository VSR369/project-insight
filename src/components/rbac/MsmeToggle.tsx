/**
 * MsmeToggle — MSME/Small Team Mode switch with Quick Assign All button
 */

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Info } from "lucide-react";
import { useMsmeConfig, useToggleMsmeConfig } from "@/hooks/queries/useMsmeConfig";

interface MsmeToggleProps {
  orgId: string;
  onQuickAssign: () => void;
}

export function MsmeToggle({ orgId, onQuickAssign }: MsmeToggleProps) {
  const { data: config } = useMsmeConfig(orgId);
  const toggleMsme = useToggleMsmeConfig();

  const isEnabled = config?.is_enabled ?? false;

  const handleToggle = (checked: boolean) => {
    toggleMsme.mutate({ orgId, isEnabled: checked });
  };

  return (
    <Card className={isEnabled ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={toggleMsme.isPending}
            />
            <div>
              <Label className="text-sm font-medium text-foreground cursor-pointer">
                MSME / Small Team Mode
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow a single person to hold all marketplace roles
              </p>
            </div>
          </div>
          {isEnabled && (
            <Button
              variant="default"
              size="sm"
              onClick={onQuickAssign}
              className="gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Quick Assign All</span>
              <span className="lg:hidden">Assign</span>
            </Button>
          )}
        </div>
        {isEnabled && (
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              When enabled, one person can be assigned to all 4 marketplace roles. Use "Quick Assign All" to assign in bulk.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
