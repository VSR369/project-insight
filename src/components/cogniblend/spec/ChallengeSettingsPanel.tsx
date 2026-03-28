/**
 * ChallengeSettingsPanel — Creator-facing collapsible settings for org-policy fields.
 * Shows Submission Deadline, Challenge Visibility, Effort Level in a clean accordion.
 * Used on AISpecReviewPage so creators can set org-policy BEFORE submitting to Legal/Curation.
 */

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CalendarIcon,
  ChevronDown,
  Eye,
  Clock,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeSettingsPanelProps {
  submissionDeadline: string | null;
  challengeVisibility: string | null;
  
  onFieldChange: (field: string, value: unknown) => void;
  readOnly?: boolean;
}


const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public", description: "Visible to all solver types" },
  { value: "private", label: "Private", description: "Only invited solvers can view" },
  { value: "invite_only", label: "Invite Only", description: "Restricted access by invitation" },
];

export default function ChallengeSettingsPanel({
  submissionDeadline,
  challengeVisibility,
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

  const filledCount = [submissionDeadline, challengeVisibility].filter(Boolean).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 w-full text-left rounded-xl border-2 border-border bg-card p-4 hover:bg-accent/30 transition-colors group">
        <Settings2 className="h-5 w-5 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Challenge Settings</p>
          <p className="text-xs text-muted-foreground">
            Deadline, visibility — {filledCount}/2 configured
          </p>
        </div>
        {filledCount === 2 && (
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

        {/* Challenge Visibility */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium text-foreground">Challenge Visibility</Label>
          </div>
          {readOnly ? (
            <p className="text-sm text-foreground pl-6 capitalize">
              {challengeVisibility?.replace(/_/g, " ") || "Not set"}
            </p>
          ) : (
            <Select
              value={challengeVisibility ?? ""}
              onValueChange={(val) => onFieldChange("challenge_visibility", val)}
            >
              <SelectTrigger className="w-full max-w-xs ml-6">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">— {opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

      </CollapsibleContent>
    </Collapsible>
  );
}
