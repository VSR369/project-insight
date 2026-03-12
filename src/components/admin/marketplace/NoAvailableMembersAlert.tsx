/**
 * SCR-05c: No Available Members Alert — 3-option actionable modal
 * BRD Ref: BR-AVAIL-004
 * Options: Broaden Domain Match / Wait for Availability / Escalate to Supervisor
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Clock, ArrowUpCircle, AlertTriangle } from "lucide-react";

interface NoAvailableMembersAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleLabel: string;
  fullyBookedCount: number;
  onBroadenDomain: () => void;
  onWaitForAvailability: () => void;
  onEscalate: () => void;
  canEscalate?: boolean;
}

export function NoAvailableMembersAlert({
  open,
  onOpenChange,
  roleLabel,
  fullyBookedCount,
  onBroadenDomain,
  onWaitForAvailability,
  onEscalate,
  canEscalate = true,
}: NoAvailableMembersAlertProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            No Available Members
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            No pool members are currently available for the <strong>{roleLabel}</strong> role.
            {fullyBookedCount > 0 && (
              <> {fullyBookedCount} member{fullyBookedCount > 1 ? "s" : ""} with this role {fullyBookedCount > 1 ? "are" : "is"} fully booked.</>
            )}
          </p>

          <div className="space-y-3">
            {/* Option 1: Broaden */}
            <Card
              className="cursor-pointer hover:bg-muted/40 transition-colors border-primary/20"
              onClick={() => {
                onBroadenDomain();
                onOpenChange(false);
              }}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <Search className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Broaden Domain Match</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clear domain filters to search across all industries and proficiencies.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Option 2: Wait */}
            <Card
              className="cursor-pointer hover:bg-muted/40 transition-colors border-amber-200 dark:border-amber-800/30"
              onClick={() => {
                onWaitForAvailability();
                onOpenChange(false);
              }}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Wait for Availability</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set a reminder to check back when pool members become available.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Option 3: Escalate */}
            {canEscalate && (
              <Card
                className="cursor-pointer hover:bg-muted/40 transition-colors border-destructive/20"
                onClick={() => {
                  onEscalate();
                  onOpenChange(false);
                }}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <ArrowUpCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Escalate to Supervisor</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Flag this role gap for Supervisor attention to expand the resource pool.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
