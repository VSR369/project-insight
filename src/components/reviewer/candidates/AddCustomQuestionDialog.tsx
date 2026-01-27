/**
 * Add Custom Question Dialog
 * Allows reviewers to add their own questions to the interview
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Plus } from "lucide-react";

interface AddCustomQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionName: string;
  availableSections: string[];
  onAdd: (question: { 
    questionText: string; 
    expectedAnswer: string | null; 
    sectionName: string;
  }) => void;
  isAdding?: boolean;
}

export function AddCustomQuestionDialog({
  open,
  onOpenChange,
  sectionName,
  availableSections,
  onAdd,
  isAdding,
}: AddCustomQuestionDialogProps) {
  const [questionText, setQuestionText] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [selectedSection, setSelectedSection] = useState(sectionName);
  const [error, setError] = useState<string | null>(null);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setQuestionText("");
      setExpectedAnswer("");
      setSelectedSection(sectionName);
      setError(null);
    }
  }, [open, sectionName]);

  const handleAdd = () => {
    if (!questionText.trim()) {
      setError("Question text is required");
      return;
    }
    if (questionText.length > 1000) {
      setError("Question text must be 1000 characters or less");
      return;
    }
    if (expectedAnswer.length > 500) {
      setError("Expected answer must be 500 characters or less");
      return;
    }

    onAdd({
      questionText: questionText.trim(),
      expectedAnswer: expectedAnswer.trim() || null,
      sectionName: selectedSection,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Custom Question
          </DialogTitle>
          <DialogDescription>
            Add your own question to the interview. This will be saved as part of your evaluation.
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
            <Label htmlFor="section">Section</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {availableSections.map((section) => (
                  <SelectItem key={section} value={section}>
                    {section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-text">Question Text *</Label>
            <Textarea
              id="question-text"
              value={questionText}
              onChange={(e) => {
                setQuestionText(e.target.value);
                setError(null);
              }}
              placeholder="Enter your interview question..."
              className="min-h-[100px]"
              maxLength={1000}
            />
            <div className="text-xs text-muted-foreground text-right">
              {questionText.length}/1000
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-answer">Expected Answer (Optional)</Label>
            <Textarea
              id="expected-answer"
              value={expectedAnswer}
              onChange={(e) => {
                setExpectedAnswer(e.target.value);
                setError(null);
              }}
              placeholder="Enter the expected answer or key points to look for..."
              className="min-h-[80px]"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {expectedAnswer.length}/500
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
