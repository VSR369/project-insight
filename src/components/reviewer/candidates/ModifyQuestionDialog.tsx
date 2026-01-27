/**
 * Modify Question Dialog
 * Allows editing question text and expected answer
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";

interface ModifyQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionText: string;
  expectedAnswer: string | null;
  questionSource: string;
  onSave: (updates: { questionText: string; expectedAnswer: string | null }) => void;
  isSaving?: boolean;
}

export function ModifyQuestionDialog({
  open,
  onOpenChange,
  questionText,
  expectedAnswer,
  questionSource,
  onSave,
  isSaving,
}: ModifyQuestionDialogProps) {
  const [localQuestionText, setLocalQuestionText] = useState(questionText);
  const [localExpectedAnswer, setLocalExpectedAnswer] = useState(expectedAnswer || "");
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setLocalQuestionText(questionText);
      setLocalExpectedAnswer(expectedAnswer || "");
      setError(null);
    }
  }, [open, questionText, expectedAnswer]);

  const handleSave = () => {
    if (!localQuestionText.trim()) {
      setError("Question text is required");
      return;
    }
    if (localQuestionText.length > 1000) {
      setError("Question text must be 1000 characters or less");
      return;
    }
    if (localExpectedAnswer.length > 500) {
      setError("Expected answer must be 500 characters or less");
      return;
    }

    onSave({
      questionText: localQuestionText.trim(),
      expectedAnswer: localExpectedAnswer.trim() || null,
    });
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'interview_kit': return 'Competency Question';
      case 'question_bank': return 'Domain Question';
      case 'proof_point': return 'Proof Point Question';
      case 'reviewer_custom': return 'Reviewer Added';
      default: return source;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Modify Question
            <Badge variant="secondary" className="text-xs">
              {getSourceLabel(questionSource)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Edit the question text and expected answer. Changes will be saved to your evaluation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded-md">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="question-text">Question Text *</Label>
            <Textarea
              id="question-text"
              value={localQuestionText}
              onChange={(e) => {
                setLocalQuestionText(e.target.value);
                setError(null);
              }}
              placeholder="Enter the interview question..."
              className="min-h-[100px]"
              maxLength={1000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {localQuestionText.length}/1000
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-answer">Expected Answer (Optional)</Label>
            <Textarea
              id="expected-answer"
              value={localExpectedAnswer}
              onChange={(e) => {
                setLocalExpectedAnswer(e.target.value);
                setError(null);
              }}
              placeholder="Enter the expected answer or key points to look for..."
              className="min-h-[80px]"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {localExpectedAnswer.length}/500
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
