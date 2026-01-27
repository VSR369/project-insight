/**
 * Interview Question Section Component
 * Collapsible section for a group of questions with add button
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { InterviewQuestionCard } from "./InterviewQuestionCard";
import { InterviewQuestionResponse } from "@/hooks/queries/useInterviewKitSession";
import { 
  InterviewRating, 
  INTERVIEW_RATING_POINTS,
  COMPETENCY_CONFIG,
} from "@/constants";

interface InterviewQuestionSectionProps {
  sectionName: string;
  questions: InterviewQuestionResponse[];
  onRatingChange: (questionId: string, rating: InterviewRating, comments?: string) => void;
  onDeleteQuestion?: (questionId: string) => void;
  onModifyQuestion?: (question: InterviewQuestionResponse) => void;
  onAddQuestion?: () => void;
  savingQuestionId?: string;
  defaultOpen?: boolean;
  isSubmitted?: boolean;
}

export function InterviewQuestionSection({
  sectionName,
  questions,
  onRatingChange,
  onDeleteQuestion,
  onModifyQuestion,
  onAddQuestion,
  savingQuestionId,
  defaultOpen = false,
  isSubmitted = false,
}: InterviewQuestionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Calculate section stats
  const ratedCount = questions.filter(q => q.rating !== null).length;
  const totalCount = questions.length;
  const earnedPoints = questions
    .filter(q => q.rating !== null)
    .reduce((sum, q) => sum + INTERVIEW_RATING_POINTS[q.rating as InterviewRating], 0);
  const maxPoints = totalCount * INTERVIEW_RATING_POINTS.right;
  const progressPercent = totalCount > 0 ? (ratedCount / totalCount) * 100 : 0;

  // Get section icon/color from competency config if applicable
  const competencyCode = Object.keys(COMPETENCY_CONFIG).find(
    code => COMPETENCY_CONFIG[code as keyof typeof COMPETENCY_CONFIG].label === sectionName
  ) as keyof typeof COMPETENCY_CONFIG | undefined;
  
  const sectionConfig = competencyCode ? COMPETENCY_CONFIG[competencyCode] : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={`border ${sectionConfig ? sectionConfig.borderColor : 'border-border/50'}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Section Icon */}
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center
                  ${sectionConfig ? sectionConfig.bgColor : 'bg-primary/10'}
                `}>
                  {isOpen ? (
                    <ChevronUp className={`h-4 w-4 ${sectionConfig ? sectionConfig.color : 'text-primary'}`} />
                  ) : (
                    <ChevronDown className={`h-4 w-4 ${sectionConfig ? sectionConfig.color : 'text-primary'}`} />
                  )}
                </div>

                {/* Section Name & Progress */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{sectionName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {totalCount} question{totalCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <Progress value={progressPercent} className="h-1 w-32" />
                </div>
              </div>

              {/* Score Summary */}
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="font-medium">{earnedPoints}/{maxPoints}</div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{ratedCount}/{totalCount}</div>
                  <div className="text-xs text-muted-foreground">Rated</div>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-3">
            {questions.map((question) => (
              <InterviewQuestionCard
                key={question.id}
                questionNumber={question.displayOrder + 1}
                questionText={question.questionText}
                expectedAnswer={question.expectedAnswer}
                rating={question.rating}
                comments={question.comments}
                questionSource={question.questionSource}
                metadata={
                  question.proofPointId 
                    ? { proofPointTitle: 'Proof Point' }
                    : question.questionSource === 'interview_kit'
                    ? { competencyName: sectionName }
                    : undefined
                }
                onRatingChange={(rating, comments) => 
                  onRatingChange(question.id, rating, comments)
                }
                onDelete={onDeleteQuestion ? () => onDeleteQuestion(question.id) : undefined}
                onModify={onModifyQuestion ? () => onModifyQuestion(question) : undefined}
                isSaving={savingQuestionId === question.id}
                isSubmitted={isSubmitted}
              />
            ))}

            {/* Add Custom Question Button */}
            {!isSubmitted && onAddQuestion && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-dashed"
                onClick={onAddQuestion}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Question to {sectionName}
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
