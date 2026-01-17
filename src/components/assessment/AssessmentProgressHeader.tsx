import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AssessmentTimer } from './AssessmentTimer';

interface AssessmentProgressHeaderProps {
  totalQuestions: number;
  answeredQuestions: number;
  startedAt: string;
  timeLimitMinutes: number;
  onTimeExpired: () => void;
  onBack: () => void;
}

export function AssessmentProgressHeader({
  totalQuestions,
  answeredQuestions,
  startedAt,
  timeLimitMinutes,
  onTimeExpired,
  onBack,
}: AssessmentProgressHeaderProps) {
  const progressPercentage = totalQuestions > 0 
    ? Math.round((answeredQuestions / totalQuestions) * 100) 
    : 0;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container max-w-5xl mx-auto px-4 py-4">
        {/* Top Row: Navigation and Timer */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Button>

          <AssessmentTimer
            startedAt={startedAt}
            timeLimitMinutes={timeLimitMinutes}
            onTimeExpired={onTimeExpired}
          />
        </div>

        {/* Title */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            Knowledge Assessment
          </h1>
          <p className="text-muted-foreground">
            Answer all questions across your declared specialties
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {answeredQuestions} of {totalQuestions} questions answered
            </span>
            <span className="font-semibold text-primary">
              {progressPercentage}%
            </span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2"
          />
        </div>
      </div>
    </div>
  );
}
