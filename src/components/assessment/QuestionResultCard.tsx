/**
 * Question Result Card
 * 
 * Displays a single question with correct/selected answer highlighting
 */

import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { QuestionResultData } from '@/services/assessmentResultsService';

interface QuestionResultCardProps {
  question: QuestionResultData;
  questionNumber: number;
  showGuidance?: boolean;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuestionResultCard({ 
  question, 
  questionNumber,
  showGuidance = true,
}: QuestionResultCardProps) {
  const { isCorrect, selectedOption, correctOption, options } = question;
  const wasAnswered = selectedOption !== null;

  return (
    <div
      className={cn(
        'p-4 rounded-lg border-2 transition-colors',
        isCorrect
          ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
          : wasAnswered
          ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10'
          : 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10'
      )}
    >
      {/* Question Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {isCorrect ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : wasAnswered ? (
            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          ) : (
            <HelpCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          )}
          <Badge variant="outline" className="font-medium">
            Q{questionNumber}
          </Badge>
          {question.difficulty && (
            <Badge variant="secondary" className="text-xs">
              {question.difficulty}
            </Badge>
          )}
        </div>
        <Badge
          variant={isCorrect ? 'default' : wasAnswered ? 'destructive' : 'secondary'}
          className="text-xs"
        >
          {isCorrect ? 'Correct' : wasAnswered ? 'Incorrect' : 'Unanswered'}
        </Badge>
      </div>

      {/* Question Text */}
      <p className="text-foreground mb-4 text-sm leading-relaxed">
        {question.questionText}
      </p>

      {/* Options */}
      <div className="space-y-2 mb-4">
        {options.map((opt, idx) => {
          const isSelected = selectedOption === opt.index;
          const isCorrectOption = correctOption === opt.index;

          return (
            <div
              key={opt.index}
              className={cn(
                'p-3 rounded-lg border text-sm',
                isCorrectOption && 'border-green-500 bg-green-100 dark:bg-green-900/30',
                isSelected && !isCorrectOption && 'border-red-500 bg-red-100 dark:bg-red-900/30',
                !isCorrectOption && !isSelected && 'border-border bg-background'
              )}
            >
              <span className="font-semibold mr-2 text-muted-foreground">
                {OPTION_LETTERS[idx]}.
              </span>
              <span className={cn(
                isCorrectOption && 'text-green-800 dark:text-green-300',
                isSelected && !isCorrectOption && 'text-red-800 dark:text-red-300'
              )}>
                {opt.text}
              </span>
              {isCorrectOption && (
                <span className="ml-2 text-green-600 font-medium text-xs">✓ Correct Answer</span>
              )}
              {isSelected && !isCorrectOption && (
                <span className="ml-2 text-red-600 font-medium text-xs">✗ Your Answer</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Answer Guidance */}
      {showGuidance && question.expectedAnswerGuidance && (
        <div className="p-3 bg-muted rounded-lg text-sm">
          <p className="font-medium text-muted-foreground mb-1">Explanation:</p>
          <p className="text-foreground">{question.expectedAnswerGuidance}</p>
        </div>
      )}
    </div>
  );
}
