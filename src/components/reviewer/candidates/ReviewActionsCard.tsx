import { useState, useEffect } from "react";
import { Flag, FileEdit, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReviewActionsCardProps {
  bookingId: string | null;
  clarificationNotes: string | null;
  reviewerNotes: string | null;
  onUpdateClarification: (notes: string) => void;
  onUpdateNotes: (notes: string) => void;
  isUpdating?: boolean;
}

const MAX_CHARS = 1000;

export function ReviewActionsCard({ 
  bookingId,
  clarificationNotes,
  reviewerNotes,
  onUpdateClarification,
  onUpdateNotes,
  isUpdating = false,
}: ReviewActionsCardProps) {
  const [localClarification, setLocalClarification] = useState(clarificationNotes || '');
  const [localNotes, setLocalNotes] = useState(reviewerNotes || '');
  
  // Sync local state when props change (e.g., after refetch)
  useEffect(() => {
    setLocalClarification(clarificationNotes || '');
  }, [clarificationNotes]);

  useEffect(() => {
    setLocalNotes(reviewerNotes || '');
  }, [reviewerNotes]);

  // Debounced save for clarification
  useEffect(() => {
    if (!bookingId) return;
    
    const timeout = setTimeout(() => {
      if (localClarification !== (clarificationNotes || '')) {
        onUpdateClarification(localClarification);
      }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [localClarification, bookingId, clarificationNotes, onUpdateClarification]);

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

  const handleClarificationChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setLocalClarification(value);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
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
          <div className="relative">
            <Textarea
              placeholder="Enter clarification notes here... (leaving text here flags the candidate)"
              value={localClarification}
              onChange={handleClarificationChange}
              disabled={isUpdating}
              className="min-h-[100px] resize-none"
              maxLength={MAX_CHARS}
            />
            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {localClarification.length}/{MAX_CHARS}
            </div>
          </div>
          {localClarification.length > 0 && (
            <p className="text-sm text-orange-600 font-medium">
              ⚠️ Candidate is flagged for clarification
            </p>
          )}
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
              className="min-h-[100px] resize-none"
              maxLength={MAX_CHARS}
            />
            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {localNotes.length}/{MAX_CHARS}
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
