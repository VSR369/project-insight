import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Clock, Users } from "lucide-react";
import { CompositeSlot, QuorumRequirement } from "@/hooks/queries/useInterviewScheduling";
import { formatInTimezone } from "./TimeZoneSelector";

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: CompositeSlot | null;
  quorumRequirement: QuorumRequirement | null;
  timezone: string;
  expertiseLevelName?: string;
  onConfirm: () => void;
  isConfirming?: boolean;
}

export function BookingConfirmDialog({
  open,
  onOpenChange,
  slot,
  quorumRequirement,
  timezone,
  expertiseLevelName,
  onConfirm,
  isConfirming,
}: BookingConfirmDialogProps) {
  if (!slot) return null;

  const duration = quorumRequirement?.interview_duration_minutes || 60;
  const requiredReviewers = quorumRequirement?.required_quorum_count || 2;

  const dateStr = formatInTimezone(slot.start_at, timezone, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = formatInTimezone(slot.start_at, timezone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Interview Booking</AlertDialogTitle>
          <AlertDialogDescription>
            Please review the details below before confirming your interview slot.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <CalendarCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">{dateStr}</p>
              <p className="text-sm text-muted-foreground">{timeStr}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>{duration} Minutes</span>
          </div>

          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span>{slot.available_reviewer_count} Reviewers (min. {requiredReviewers})</span>
          </div>

          {expertiseLevelName && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Interview Type:</span>
              <Badge variant="secondary">{expertiseLevelName} Interview</Badge>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConfirming}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? "Booking..." : "Confirm Booking"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
