import { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface QuestionOption {
  index: number;
  text: string;
}

interface QuestionCardProps {
  questionNumber: number;
  questionText: string;
  options: QuestionOption[];
  selectedOption: number | null;
  onSelectOption: (optionIndex: number) => void;
  isAnswered: boolean;
  isSaving?: boolean;
  difficulty?: string | null;
  className?: string;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuestionCard({
  questionNumber,
  questionText,
  options,
  selectedOption,
  onSelectOption,
  isAnswered,
  isSaving,
  difficulty,
  className,
}: QuestionCardProps) {
  return (
    <Card className={cn(
      'border-2 transition-all duration-200',
      isAnswered ? 'border-green-200 dark:border-green-800' : 'border-border',
      className
    )}>
      <CardContent className="pt-6">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Badge 
              variant="outline" 
              className={cn(
                'font-semibold',
                isAnswered 
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                  : 'bg-muted'
              )}
            >
              {isAnswered && <Check className="h-3 w-3 mr-1" />}
              Question {questionNumber}
            </Badge>
            {difficulty && (
              <Badge variant="secondary" className="text-xs">
                {difficulty}
              </Badge>
            )}
          </div>
          {isSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Saving...
            </span>
          )}
        </div>

        {/* Question Text */}
        <p className="text-base leading-relaxed mb-6 text-foreground">
          {questionText}
        </p>

        {/* Options */}
        <RadioGroup
          value={selectedOption?.toString() ?? ''}
          onValueChange={(value) => onSelectOption(parseInt(value))}
          className="space-y-3"
        >
          {options.map((option, idx) => (
            <div
              key={option.index}
              className={cn(
                'flex items-start space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-accent/50',
                selectedOption === option.index
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onSelectOption(option.index)}
            >
              <RadioGroupItem
                value={option.index.toString()}
                id={`q${questionNumber}-option-${option.index}`}
                className="mt-0.5"
              />
              <Label
                htmlFor={`q${questionNumber}-option-${option.index}`}
                className="flex-1 cursor-pointer leading-relaxed"
              >
                <span className="font-semibold text-muted-foreground mr-2">
                  {OPTION_LETTERS[idx]}.
                </span>
                {option.text}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
