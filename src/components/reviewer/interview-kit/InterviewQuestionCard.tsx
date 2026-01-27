/**
 * Interview Question Card Component
 * 
 * Displays a single interview question with:
 * - Question number and text
 * - Hierarchy path (for domain questions)
 * - Collapsible expected answer
 * - Rating radio buttons (Right/Wrong/Not Answered)
 * - Optional comments
 * - Edit/Delete buttons
 */

import { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { InterviewQuestionResponse, QuestionRating } from "@/hooks/queries/useInterviewKitEvaluation";

interface InterviewQuestionCardProps {
  question: InterviewQuestionResponse;
  questionNumber: number;
  onRatingChange: (questionId: string, rating: QuestionRating, comments?: string) => void;
  onEdit: (question: InterviewQuestionResponse) => void;
  onDelete: (questionId: string) => void;
  isUpdating?: boolean;
}

export function InterviewQuestionCard({
  question,
  questionNumber,
  onRatingChange,
  onEdit,
  onDelete,
  isUpdating = false,
}: InterviewQuestionCardProps) {
  const MAX_COMMENTS_CHARS = 500;
  const [showExpectedAnswer, setShowExpectedAnswer] = useState(false);
  const [comments, setComments] = useState(question.comments || "");
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const handleRatingChange = (value: string) => {
    const rating = value as QuestionRating;
    onRatingChange(question.id, rating, hasLocalChanges ? comments : undefined);
  };

  const handleCommentsBlur = () => {
    if (hasLocalChanges && comments !== question.comments) {
      onRatingChange(question.id, question.rating, comments);
      setHasLocalChanges(false);
    }
  };

  const ratingValue = question.rating || "";

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Header: Question number, text, and action buttons */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-primary shrink-0">
              Q{questionNumber}.
            </span>
            <p className="text-foreground leading-relaxed">{question.questionText}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(question)}
            disabled={isUpdating}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(question.id)}
            disabled={isUpdating}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hierarchy Path (for domain questions) */}
      {question.sectionType === 'domain' && question.hierarchyPath && (
        <div className="text-sm text-muted-foreground space-y-1 pl-6">
          <div className="flex items-center gap-2">
            <span className="font-medium">Proficiency:</span>
            <span>{question.hierarchyPath.proficiencyArea}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Sub-domain:</span>
            <span>{question.hierarchyPath.subDomain}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Speciality:</span>
            <span>{question.hierarchyPath.speciality}</span>
          </div>
        </div>
      )}

      {/* Expected Answer Collapsible */}
      {question.expectedAnswer && (
        <Collapsible open={showExpectedAnswer} onOpenChange={setShowExpectedAnswer}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              {showExpectedAnswer ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Strong answer should include...
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 pl-6 pr-4 py-3 bg-muted/50 rounded-md text-sm text-muted-foreground whitespace-pre-wrap">
              {question.expectedAnswer}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Rating Radio Group */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Rating <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={ratingValue}
          onValueChange={handleRatingChange}
          className="flex flex-wrap gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="right" id={`${question.id}-right`} />
            <Label
              htmlFor={`${question.id}-right`}
              className={cn(
                "cursor-pointer flex items-center gap-1",
                question.rating === 'right' && "text-green-600 font-medium"
              )}
            >
              Right
              <Badge variant="secondary" className="ml-1">5</Badge>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="wrong" id={`${question.id}-wrong`} />
            <Label
              htmlFor={`${question.id}-wrong`}
              className={cn(
                "cursor-pointer flex items-center gap-1",
                question.rating === 'wrong' && "text-destructive font-medium"
              )}
            >
              Wrong
              <Badge variant="secondary" className="ml-1">0</Badge>
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="not_answered" id={`${question.id}-not_answered`} />
            <Label
              htmlFor={`${question.id}-not_answered`}
              className={cn(
                "cursor-pointer flex items-center gap-1",
                question.rating === 'not_answered' && "text-amber-600 font-medium"
              )}
            >
              Not Answered
              <Badge variant="secondary" className="ml-1">0</Badge>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Comments (optional) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor={`${question.id}-comments`} className="text-sm font-medium">
            Comments
          </Label>
          <span className="text-xs text-muted-foreground">
            {comments.length}/{MAX_COMMENTS_CHARS}
          </span>
        </div>
        <Textarea
          id={`${question.id}-comments`}
          placeholder="Add your assessment comments here... (optional)"
          value={comments}
          onChange={(e) => {
            if (e.target.value.length <= MAX_COMMENTS_CHARS) {
              setComments(e.target.value);
              setHasLocalChanges(true);
            }
          }}
          onBlur={handleCommentsBlur}
          maxLength={MAX_COMMENTS_CHARS}
          className="min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
}
