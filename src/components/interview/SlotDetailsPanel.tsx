import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarCheck, Clock, Users, CheckCircle, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { CompositeSlot, QuorumRequirement } from "@/hooks/queries/useInterviewScheduling";
import { formatInTimezone } from "./TimeZoneSelector";

interface SlotDetailsPanelProps {
  slot: CompositeSlot | null;
  quorumRequirement: QuorumRequirement | null;
  timezone: string;
  expertiseLevelName?: string;
  onBookSlot: () => void;
  isBooking?: boolean;
}

export function SlotDetailsPanel({
  slot,
  quorumRequirement,
  timezone,
  expertiseLevelName,
  onBookSlot,
  isBooking,
}: SlotDetailsPanelProps) {
  if (!slot) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-12 text-center">
          <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Select a Time Slot</h3>
          <p className="text-muted-foreground text-sm max-w-[200px]">
            Choose an available date from the calendar, then select a time slot to view details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const duration = quorumRequirement?.interview_duration_minutes || 60;
  const requiredReviewers = quorumRequirement?.required_quorum_count || 2;
  const isQuorumMet = slot.available_reviewer_count >= requiredReviewers;

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

  const endTimeStr = formatInTimezone(slot.end_at, timezone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Slot Details</CardTitle>
        <CardDescription>Review and confirm your interview slot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date & Time */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CalendarCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">{dateStr}</p>
              <p className="text-sm text-muted-foreground">
                {timeStr} - {endTimeStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{duration} Minutes</p>
              <p className="text-sm text-muted-foreground">Interview Duration</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Interview Type */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Interview Type</h4>
          <Badge variant="secondary" className="text-sm">
            {expertiseLevelName || "Expertise Level"} Interview
          </Badge>
        </div>

        <Separator />

        {/* Quorum Status */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {slot.available_reviewer_count} Reviewers Available
              </p>
              <p className="text-sm text-muted-foreground">
                Minimum {requiredReviewers} required
              </p>
            </div>
          </div>

          {isQuorumMet && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Required criteria met</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={onBookSlot}
            disabled={isBooking || !isQuorumMet}
          >
            {isBooking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Booking...
              </>
            ) : (
              "Book This Slot"
            )}
          </Button>

          <Button variant="ghost" className="w-full" size="sm" disabled>
            <MessageSquare className="mr-2 h-4 w-4" />
            Request Alternative Time
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Alternative time requests coming soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
