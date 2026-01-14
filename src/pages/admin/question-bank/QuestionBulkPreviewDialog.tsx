import * as React from "react";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Question, parseQuestionOptions } from "@/hooks/queries/useQuestionBank";

interface QuestionBulkPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: Question[];
  specialityName?: string;
}

const difficultyLabels = ["", "Very Easy", "Easy", "Medium", "Hard", "Very Hard"];
const difficultyColors = [
  "",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-red-100 text-red-800 border-red-200",
];

export function QuestionBulkPreviewDialog({
  open,
  onOpenChange,
  questions,
  specialityName,
}: QuestionBulkPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);

  // Reset index when dialog opens or questions change
  React.useEffect(() => {
    if (open) {
      setCurrentIndex(0);
    }
  }, [open, questions]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : questions.length - 1));
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setCurrentIndex((prev) => (prev < questions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentIndex(questions.length - 1);
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, questions.length, onOpenChange]);

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentIndex];
  const options = parseQuestionOptions(currentQuestion.options);
  const difficultyLevel = currentQuestion.difficulty_level;
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : questions.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < questions.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Question Preview
                <Badge variant="secondary" className="ml-2">
                  {currentIndex + 1} of {questions.length}
                </Badge>
              </DialogTitle>
              <DialogDescription className="mt-1">
                {specialityName && <span>{specialityName} • </span>}
                Use arrow keys or buttons to navigate
              </DialogDescription>
            </div>
          </div>
          <Progress value={progress} className="h-1 mt-3" />
        </DialogHeader>

        {/* Question Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 animate-fade-in" key={currentQuestion.id}>
          {/* Status and Difficulty Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={currentQuestion.is_active 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-red-50 text-red-700 border-red-200"
              }
            >
              {currentQuestion.is_active ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
              )}
            </Badge>
            {difficultyLevel && (
              <Badge variant="outline" className={difficultyColors[difficultyLevel]}>
                {difficultyLabels[difficultyLevel]}
              </Badge>
            )}
            {!difficultyLevel && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Difficulty not set
              </Badge>
            )}
          </div>

          <Separator />

          {/* Question Text */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Question</h4>
            <p className="text-base font-medium leading-relaxed">{currentQuestion.question_text}</p>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Answer Options</h4>
            <div className="space-y-2">
              {options.map((opt) => {
                const isCorrect = opt.index === currentQuestion.correct_option;
                return (
                  <div
                    key={opt.index}
                    className={`p-3 rounded-lg border transition-colors ${
                      isCorrect
                        ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-800"
                        : "bg-muted/30 border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${
                          isCorrect
                            ? "bg-green-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {String.fromCharCode(64 + opt.index)}
                      </span>
                      <div className="flex-1 pt-0.5">
                        <p className={isCorrect ? "font-medium text-green-800 dark:text-green-200" : ""}>
                          {opt.text}
                        </p>
                        {isCorrect && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>Correct Answer</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
          {/* Question dots/thumbnails for quick navigation */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[50%] py-1">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all flex-shrink-0 ${
                  idx === currentIndex
                    ? "bg-primary w-4"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to question ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
