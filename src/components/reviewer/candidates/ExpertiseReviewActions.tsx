import { useState, useEffect } from "react";
import { Flag, FileEdit, Info, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CandidateExpertise } from "@/hooks/queries/useCandidateExpertise";

interface ExpertiseReviewActionsProps {
  enrollmentId: string;
  expertise: CandidateExpertise;
  onUpdateFlag: (flag: string) => void;
  onUpdateNotes: (notes: string) => void;
  onVerify: () => void;
  isUpdating?: boolean;
  isVerifying?: boolean;
}

const MAX_FLAG_CHARS = 1000;
const MAX_NOTES_CHARS = 2000;

export function ExpertiseReviewActions({
  enrollmentId,
  expertise,
  onUpdateFlag,
  onUpdateNotes,
  onVerify,
  isUpdating = false,
  isVerifying = false,
}: ExpertiseReviewActionsProps) {
  const [localFlag, setLocalFlag] = useState(expertise.flagForClarification || "");
  const [localNotes, setLocalNotes] = useState(expertise.reviewerNotes || "");

  const isVerified = expertise.reviewStatus === "verified";

  // Sync local state when props change
  useEffect(() => {
    setLocalFlag(expertise.flagForClarification || "");
  }, [expertise.flagForClarification]);

  useEffect(() => {
    setLocalNotes(expertise.reviewerNotes || "");
  }, [expertise.reviewerNotes]);

  // Debounced save for flag
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localFlag !== (expertise.flagForClarification || "")) {
        onUpdateFlag(localFlag);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [localFlag, expertise.flagForClarification, onUpdateFlag]);

  // Debounced save for notes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localNotes !== (expertise.reviewerNotes || "")) {
        onUpdateNotes(localNotes);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [localNotes, expertise.reviewerNotes, onUpdateNotes]);

  const handleFlagChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_FLAG_CHARS) {
      setLocalFlag(value);
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NOTES_CHARS) {
      setLocalNotes(value);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          📋 Expertise Review Actions
          {(isUpdating || isVerifying) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Flag for Clarification */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base font-medium">
              <Flag className="h-4 w-4 text-orange-500" />
              Flag for Clarification
            </Label>
            <div className="relative">
              <Textarea
                placeholder="Enter clarification notes here... (leaving text here flags the expertise section)"
                value={localFlag}
                onChange={handleFlagChange}
                disabled={isUpdating || isVerifying}
                className="min-h-[120px] resize-none"
                maxLength={MAX_FLAG_CHARS}
              />
              <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {localFlag.length}/{MAX_FLAG_CHARS}
              </div>
            </div>
            {localFlag.length > 0 && (
              <p className="text-sm text-orange-600 font-medium">
                ⚠️ Expertise section is flagged for clarification
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
                placeholder="Enter your internal review notes here..."
                value={localNotes}
                onChange={handleNotesChange}
                disabled={isUpdating || isVerifying}
                className="min-h-[120px] resize-none"
                maxLength={MAX_NOTES_CHARS}
              />
              <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {localNotes.length}/{MAX_NOTES_CHARS}
              </div>
            </div>
          </div>
        </div>

        {/* Verify Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Alert className="bg-muted/50 border-muted-foreground/20 flex-1 mr-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Notes are internal and visible to panel reviewers only. Changes are auto-saved.
            </AlertDescription>
          </Alert>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={isVerified || isVerifying || isUpdating}
                className="gap-2"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {isVerified ? "Verified" : "Verify Expertise"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Verify Expertise</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to mark this provider's expertise as verified? 
                  This action indicates you have reviewed their proficiency areas and specialities.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onVerify}>
                  Confirm Verification
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
