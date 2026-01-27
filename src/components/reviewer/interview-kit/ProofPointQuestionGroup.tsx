/**
 * Proof Point Question Group Component
 * 
 * Displays a proof point with its associated questions.
 * Shows proof point header, context, and nested question cards.
 */

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { InterviewQuestionCard } from "./InterviewQuestionCard";
import type { InterviewQuestionResponse, QuestionRating } from "@/hooks/queries/useInterviewKitEvaluation";
import type { ProofPointForReview } from "@/hooks/queries/useCandidateProofPoints";

interface ProofPointQuestionGroupProps {
  proofPoint: ProofPointForReview;
  questions: InterviewQuestionResponse[];
  startIndex: number; // For question numbering
  onRatingChange: (questionId: string, rating: QuestionRating, comments?: string) => void;
  onEditQuestion: (question: InterviewQuestionResponse) => void;
  onDeleteQuestion: (questionId: string) => void;
  onAddQuestion: (proofPointId: string, proofPointTitle: string) => void;
  isUpdating?: boolean;
}

export function ProofPointQuestionGroup({
  proofPoint,
  questions,
  startIndex,
  onRatingChange,
  onEditQuestion,
  onDeleteQuestion,
  onAddQuestion,
  isUpdating = false,
}: ProofPointQuestionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate stats for this proof point
  const ratedCount = questions.filter(q => q.rating !== null).length;
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  const maxScore = questions.length * 5;
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Get relevance badge color
  const getRelevanceBadge = () => {
    if (!proofPoint.reviewRelevanceRating) return null;
    
    const colors: Record<string, string> = {
      high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
      <Badge 
        variant="secondary" 
        className={cn("text-xs capitalize", colors[proofPoint.reviewRelevanceRating])}
      >
        {proofPoint.reviewRelevanceRating} Relevance
      </Badge>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Proof Point Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-between w-full px-4 py-3 bg-muted/30 cursor-pointer transition-colors",
              "hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{proofPoint.title}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs">
                  PP {String(startIndex).padStart(2, '0')}
                </Badge>
                {getRelevanceBadge()}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm ml-4 shrink-0">
              <span className="text-muted-foreground">
                {totalScore}/{maxScore}
              </span>
              <span className="text-muted-foreground w-10 text-right">
                {percentage}%
              </span>
              <span className="text-muted-foreground w-20 text-right">
                {ratedCount}/{questions.length} rated
              </span>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 space-y-4 border-t bg-background">
            {/* Proof Point Context */}
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-medium text-muted-foreground shrink-0">Context Outcome:</span>
                <p className="text-foreground line-clamp-2">{proofPoint.description}</p>
              </div>
              
              {proofPoint.hierarchyPath && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{proofPoint.hierarchyPath}</span>
                </div>
              )}

              <p className="text-muted-foreground">
                {questions.length} question{questions.length !== 1 ? 's' : ''} generated
              </p>
            </div>

            {/* Questions */}
            <div className="space-y-4">
              {questions.map((question, idx) => (
                <InterviewQuestionCard
                  key={question.id}
                  question={question}
                  questionNumber={startIndex + idx}
                  onRatingChange={onRatingChange}
                  onEdit={onEditQuestion}
                  onDelete={onDeleteQuestion}
                  isUpdating={isUpdating}
                />
              ))}
            </div>

            {/* Add Question Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onAddQuestion(proofPoint.id, proofPoint.title)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Question
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
