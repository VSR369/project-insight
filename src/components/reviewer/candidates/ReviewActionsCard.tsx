import { useState, useEffect } from "react";
import { Flag, FileEdit, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReviewActionsCardProps {
  bookingId: string | null;
  flagForClarification: boolean;
  reviewerNotes: string | null;
  onUpdateFlag: (flagged: boolean) => void;
  onUpdateNotes: (notes: string) => void;
  isUpdating?: boolean;
}

const MAX_NOTES_LENGTH = 1000;

export function ReviewActionsCard({ 
  bookingId,
  flagForClarification,
  reviewerNotes,
  onUpdateFlag,
  onUpdateNotes,
  isUpdating = false,
}: ReviewActionsCardProps) {
  const [localNotes, setLocalNotes] = useState(reviewerNotes || '');
  
  // Sync local state when prop changes (e.g., after refetch)
  useEffect(() => {
    setLocalNotes(reviewerNotes || '');
  }, [reviewerNotes]);

  // Debounced save for notes
  useEffect(() => {
    if (!bookingId) return;
    
    const timeout = setTimeout(() => {
      if (localNotes !== (reviewerNotes || '')) {
        onUpdateNotes(localNotes);
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [localNotes, bookingId, reviewerNotes, onUpdateNotes]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NOTES_LENGTH) {
      setLocalNotes(value);
    }
  };

  // No booking yet - show disabled state
  if (!bookingId) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            📋 Review Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-muted/50 border-muted-foreground/20">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Review actions will be available once the candidate schedules an interview.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          📋 Review Actions
          {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Flag for Clarification */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Flag className="h-4 w-4 text-orange-500" />
            Flag for Clarification
          </Label>
          <div className="flex items-center space-x-3 p-3 rounded-lg border bg-muted/30">
            <Checkbox
              id="flag-clarification"
              checked={flagForClarification}
              onCheckedChange={(checked) => onUpdateFlag(checked === true)}
              disabled={isUpdating}
            />
            <Label 
              htmlFor="flag-clarification" 
              className={`cursor-pointer ${flagForClarification ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}
            >
              {flagForClarification 
                ? "Flagged for clarification" 
                : "Flag this candidate for clarification"}
            </Label>
          </div>
        </div>

        {/* Reviewer Notes */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base font-medium">
            <FileEdit className="h-4 w-4 text-blue-500" />
            Reviewer Notes
          </Label>
          <div className="relative">
            <Textarea
              placeholder="Enter your review notes here..."
              value={localNotes}
              onChange={handleNotesChange}
              disabled={isUpdating}
              className="min-h-[120px] resize-none"
              maxLength={MAX_NOTES_LENGTH}
            />
            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {localNotes.length}/{MAX_NOTES_LENGTH}
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <Alert className="bg-muted/50 border-muted-foreground/20">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Notes are internal and visible to panel reviewers only. Changes are auto-saved.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
