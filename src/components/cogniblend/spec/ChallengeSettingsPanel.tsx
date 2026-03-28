/**
 * ChallengeSettingsPanel — Creator-facing collapsible settings for org-policy fields.
 * Shows Submission Deadline in a clean accordion.
 * Used on AISpecReviewPage so creators can set org-policy BEFORE submitting to Legal/Curation.
 */

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarIcon,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeSettingsPanelProps {
  submissionDeadline: string | null;
  onFieldChange: (field: string, value: unknown) => void;
  readOnly?: boolean;
}

export default function ChallengeSettingsPanel({
  submissionDeadline,
  onFieldChange,
  readOnly = false,
}: ChallengeSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>(
    submissionDeadline ? new Date(submissionDeadline) : undefined,
  );

  const handleDateSelect = useCallback(
    (date: Date | undefined) => {
      setDeadlineDate(date);
      onFieldChange("submission_deadline", date ? date.toISOString() : null);
    },
    [onFieldChange],
  );

  const filledCount = [submissionDeadline].filter(Boolean).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 w-full text-left rounded-xl border-2 border-border bg-card p-4 hover:bg-accent/30 transition-colors group">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Challenge Settings</p>
          <p className="text-xs text-muted-foreground">
            Deadline — {filledCount}/1 configured
          </p>
        </div>
        {filledCount === 1 && (
          <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
            Complete
          </Badge>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-xl border-2 border-t-0 border-border bg-card px-5 pb-5 pt-3 space-y-5">
        {/* Submission Deadline */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">Submission Deadline</Label>
          </div>
          {readOnly ? (
            <p className="text-sm text-foreground pl-6">
              {submissionDeadline
                ? format(new Date(submissionDeadline), "MMMM d, yyyy")
                : "Not set"}
            </p>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full max-w-xs justify-start text-left font-normal ml-6",
                    !deadlineDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadlineDate ? format(deadlineDate, "MMMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadlineDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
