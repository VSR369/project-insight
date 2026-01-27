/**
 * Interview Question Card
 * Individual question display with rating controls and actions
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { RATING_CONFIG, type InterviewRating } from "@/constants/interview-kit-reviewer.constants";
import type { InterviewQuestionResponse } from "@/hooks/queries/useInterviewKit";

interface InterviewQuestionCardProps {
  question: InterviewQuestionResponse;
  questionNumber: number;
  onRatingChange: (responseId: string, rating: InterviewRating) => void;
  onCommentsChange: (responseId: string, comments: string) => void;
  onEdit: (question: InterviewQuestionResponse) => void;
  onDelete: (question: InterviewQuestionResponse) => void;
  isUpdating?: boolean;
}

export function InterviewQuestionCard({
  question,
  questionNumber,
  onRatingChange,
  onCommentsChange,
  onEdit,
  onDelete,
  isUpdating,
}: InterviewQuestionCardProps) {
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [localComments, setLocalComments] = useState(question.comments || "");

  const handleCommentsBlur = () => {
    if (localComments !== question.comments) {
      onCommentsChange(question.id, localComments);
    }
  };

  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="pt-4 space-y-4">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary">Q{questionNumber}.</span>
              <p className="text-sm font-medium">{question.question_text}</p>
            </div>
            
            {/* Section Label for Proof Points */}
            {question.section_label && (
              <p className="text-xs text-muted-foreground pl-6">
                Proof Point: <span className="font-medium">{question.section_label}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onEdit(question)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(question)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Expected Answer Guidance (Collapsible) */}
        {question.expected_answer && (
          <Collapsible open={guidanceOpen} onOpenChange={setGuidanceOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
                {guidanceOpen ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                Strong answer should include...
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="bg-muted/50 rounded-md p-3 text-sm text-muted-foreground">
                {question.expected_answer}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Rating Controls */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Rating *</Label>
          <RadioGroup
            value={question.rating || ""}
            onValueChange={(value) => onRatingChange(question.id, value as InterviewRating)}
            className="flex flex-wrap gap-4"
            disabled={isUpdating}
          >
            {Object.entries(RATING_CONFIG).map(([key, config]) => (
              <div key={key} className="flex items-center space-x-2">
                <RadioGroupItem value={key} id={`${question.id}-${key}`} />
                <Label 
                  htmlFor={`${question.id}-${key}`} 
                  className={`text-sm cursor-pointer ${question.rating === key ? config.color : ''}`}
                >
                  {config.label} ({config.points})
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Comments (Optional) */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Comments</Label>
          <Textarea
            value={localComments}
            onChange={(e) => setLocalComments(e.target.value)}
            onBlur={handleCommentsBlur}
            placeholder="Add your assessment comments here..."
            className="min-h-[60px] text-sm resize-none"
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
}
