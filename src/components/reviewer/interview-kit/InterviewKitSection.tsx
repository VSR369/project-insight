/**
 * Interview Kit Section
 * Collapsible section for grouping questions by type/competency
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, BookOpen, Award, Lightbulb } from "lucide-react";
import { SECTION_TYPE, RATING_VALUES } from "@/constants/interview-kit-reviewer.constants";
import { InterviewQuestionCard } from "./InterviewQuestionCard";
import type { InterviewQuestionResponse } from "@/hooks/queries/useInterviewKit";
import type { InterviewRating } from "@/constants/interview-kit-reviewer.constants";

interface InterviewKitSectionProps {
  sectionName: string;
  sectionType: string;
  questions: InterviewQuestionResponse[];
  onRatingChange: (responseId: string, rating: InterviewRating) => void;
  onCommentsChange: (responseId: string, comments: string) => void;
  onEditQuestion: (question: InterviewQuestionResponse) => void;
  onDeleteQuestion: (question: InterviewQuestionResponse) => void;
  onAddQuestion: (sectionName: string, sectionType: string) => void;
  isUpdating?: boolean;
  defaultExpanded?: boolean;
}

export function InterviewKitSection({
  sectionName,
  sectionType,
  questions,
  onRatingChange,
  onCommentsChange,
  onEditQuestion,
  onDeleteQuestion,
  onAddQuestion,
  isUpdating,
  defaultExpanded = false,
}: InterviewKitSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  // Calculate section stats
  const totalQuestions = questions.length;
  const ratedCount = questions.filter(q => q.rating).length;
  const sectionScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
  const maxScore = totalQuestions * RATING_VALUES.right;

  // Get section icon
  const getSectionIcon = () => {
    switch (sectionType) {
      case SECTION_TYPE.domain:
        return <BookOpen className="h-4 w-4" />;
      case SECTION_TYPE.proof_point:
        return <Award className="h-4 w-4" />;
      case SECTION_TYPE.competency:
        return <Lightbulb className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  // Get section color classes
  const getSectionColors = () => {
    switch (sectionType) {
      case SECTION_TYPE.domain:
        return 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20';
      case SECTION_TYPE.proof_point:
        return 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20';
      case SECTION_TYPE.competency:
        return 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20';
      default:
        return 'border-border';
    }
  };

  return (
    <Card className={`${getSectionColors()} transition-colors`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                {getSectionIcon()}
                <span className="font-medium">{sectionName}</span>
                <Badge variant="secondary" className="text-xs">
                  {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{sectionScore}/{maxScore}</span>
                <span>{ratedCount}/{totalQuestions} rated</span>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Questions List */}
            {questions.map((question, idx) => (
              <InterviewQuestionCard
                key={question.id}
                question={question}
                questionNumber={idx + 1}
                onRatingChange={onRatingChange}
                onCommentsChange={onCommentsChange}
                onEdit={onEditQuestion}
                onDelete={onDeleteQuestion}
                isUpdating={isUpdating}
              />
            ))}

            {/* Add Question Button */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onAddQuestion(sectionName, sectionType)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Question
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
