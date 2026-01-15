import * as React from "react";
import { CheckCircle, XCircle, Eye, Edit, Copy, Tags } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Question, parseQuestionOptions, DIFFICULTY_OPTIONS } from "@/hooks/queries/useQuestionBank";

interface QuestionPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  specialityName?: string;
  onEdit?: (question: Question) => void;
  onDuplicate?: (question: Question) => void;
}

const difficultyColors: Record<string, string> = {
  introductory: "bg-emerald-100 text-emerald-800 border-emerald-200",
  applied: "bg-green-100 text-green-800 border-green-200",
  advanced: "bg-yellow-100 text-yellow-800 border-yellow-200",
  strategic: "bg-red-100 text-red-800 border-red-200",
};

export function QuestionPreviewDialog({
  open,
  onOpenChange,
  question,
  specialityName,
  onEdit,
  onDuplicate,
}: QuestionPreviewDialogProps) {
  if (!question) return null;

  const options = parseQuestionOptions(question.options);
  const difficulty = question.difficulty;
  const difficultyLabel = difficulty ? DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.label : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <DialogTitle>Question Preview</DialogTitle>
          </div>
          <DialogDescription>
            Viewing question details
            {specialityName && <span className="ml-1">• {specialityName}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status and Difficulty Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="outline" 
              className={question.is_active 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-red-50 text-red-700 border-red-200"
              }
            >
              {question.is_active ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
              )}
            </Badge>
            {difficulty && difficultyLabel && (
              <Badge variant="outline" className={difficultyColors[difficulty] || ""}>
                {difficultyLabel}
              </Badge>
            )}
            {!difficulty && (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Difficulty not set
              </Badge>
            )}
          </div>

          {/* Capability Tags */}
          {question.question_capability_tags && question.question_capability_tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Tags className="h-4 w-4" />
                Capability Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {question.question_capability_tags.map((tagRelation) => (
                  tagRelation.capability_tags && (
                    <Badge 
                      key={tagRelation.id} 
                      variant="secondary"
                      className="bg-purple-100 text-purple-700 border-purple-200"
                    >
                      {tagRelation.capability_tags.name}
                    </Badge>
                  )
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Question Text */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Question</h4>
            <p className="text-base font-medium leading-relaxed">{question.question_text}</p>
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Answer Options</h4>
            <div className="space-y-2">
              {options.map((opt) => {
                const isCorrect = opt.index === question.correct_option;
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

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>
              <p className="font-medium">
                {new Date(question.created_at).toLocaleDateString()}
              </p>
            </div>
            {question.updated_at && (
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <p className="font-medium">
                  {new Date(question.updated_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDuplicate && (
            <Button
              variant="outline"
              onClick={() => {
                onDuplicate(question);
                onOpenChange(false);
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </Button>
          )}
          {onEdit && (
            <Button
              onClick={() => {
                onEdit(question);
                onOpenChange(false);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Question
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}