/**
 * Composite Score Banner
 * 
 * Displays the composite score prominently with certification outcome and stars.
 */

import { Star, Award, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  type CertificationOutcome,
  OUTCOME_DISPLAY,
} from '@/constants/certification.constants';
import { cn } from '@/lib/utils';

interface CompositeScoreBannerProps {
  compositeScore: number | null;
  isComplete: boolean;
  certificationOutcome: CertificationOutcome | null;
}

export function CompositeScoreBanner({
  compositeScore,
  isComplete,
  certificationOutcome,
}: CompositeScoreBannerProps) {
  // Incomplete state
  if (!isComplete || compositeScore === null || certificationOutcome === null) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-lg font-medium text-muted-foreground">
                Composite Score Incomplete
              </p>
              <p className="text-sm text-muted-foreground">
                All evaluation stages must be completed to calculate the final score
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const outcomeConfig = OUTCOME_DISPLAY[certificationOutcome];

  return (
    <Card className={cn('border-2', outcomeConfig.bgClass)}>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Score Display */}
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex items-center justify-center w-20 h-20 rounded-full',
              outcomeConfig.bgClass,
              'border-4',
              certificationOutcome === 'interview_unsuccessful' && 'border-amber-300',
              certificationOutcome === 'one_star' && 'border-amber-300',
              certificationOutcome === 'two_star' && 'border-blue-300',
              certificationOutcome === 'three_star' && 'border-green-300'
            )}>
              <span className={cn('text-2xl font-bold', outcomeConfig.textClass)}>
                {compositeScore.toFixed(1)}%
              </span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Composite Score
              </h3>
              <p className="text-sm text-muted-foreground">
                Weighted average of all evaluations
              </p>
            </div>
          </div>

          {/* Certification Outcome */}
          <div className={cn(
            'flex flex-col items-center gap-2 px-6 py-4 rounded-lg',
            outcomeConfig.bgClass
          )}>
            {/* Stars */}
            <div className="flex items-center gap-1">
              {outcomeConfig.stars > 0 ? (
                Array.from({ length: outcomeConfig.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn('h-6 w-6 fill-current', outcomeConfig.colorClass)}
                  />
                ))
              ) : (
                <Award className="h-6 w-6 text-destructive" />
              )}
            </div>

            {/* Label */}
            <span className={cn('text-lg font-bold', outcomeConfig.textClass)}>
              {outcomeConfig.label}
            </span>

            {/* Star Rating Text */}
            {outcomeConfig.stars > 0 && (
              <span className={cn('text-sm', outcomeConfig.textClass)}>
                {outcomeConfig.stars === 1 && 'One Star'}
                {outcomeConfig.stars === 2 && 'Two Star'}
                {outcomeConfig.stars === 3 && 'Three Star'}
              </span>
            )}
          </div>
        </div>

        {/* Score Breakdown (small text) */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Score weights: Proof Points (30%) + Knowledge Assessment (50%) + Interview (20%)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
