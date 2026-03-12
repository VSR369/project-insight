/**
 * SCR-05b: Fully Booked Alternatives Modal
 * BRD Ref: BR-ASSIGN-003
 * Shows alternative pool members when selected member is fully booked
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus } from "lucide-react";
import { AvailabilityBadge } from "@/components/admin/marketplace/AvailabilityBadge";
import { useAvailabilityStatuses } from "@/hooks/queries/useAvailabilityStatuses";
import type { PoolMemberRow } from "@/hooks/queries/usePoolMembers";

interface FullyBookedAlternativesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleLabel: string;
  alternatives: PoolMemberRow[];
  onSelect: (memberId: string) => void;
}

export function FullyBookedAlternativesModal({
  open,
  onOpenChange,
  roleLabel,
  alternatives,
  onSelect,
}: FullyBookedAlternativesModalProps) {
  const { data: availStatuses } = useAvailabilityStatuses();

  const getAvailLabel = (status: string) =>
    availStatuses?.find((s) => s.code === status)?.display_name ?? status;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Available Alternatives — {roleLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          {alternatives.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No available alternatives found for this role.
            </div>
          ) : (
            <div className="space-y-2">
              {alternatives.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <AvailabilityBadge
                        status={member.availability_status}
                        label={getAvailLabel(member.availability_status)}
                      />
                      <Badge variant="outline" className="text-[10px]">
                        {member.current_assignments}/{member.max_concurrent} slots
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelect(member.id);
                      onOpenChange(false);
                    }}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
