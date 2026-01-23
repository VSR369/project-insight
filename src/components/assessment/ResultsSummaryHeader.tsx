/**
 * Assessment Results Summary Header
 * 
 * Displays provider context and KPI summary
 */

import { User, Building2, GraduationCap, Target, CheckCircle2, Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ResultsSummaryHeaderProps {
  providerName: string;
  industrySegment: string;
  expertiseLevel: string;
  totalQuestions: number;
  correctQuestions: number;
  scorePercentage: number;
  overallRating: number;
  isPassed: boolean;
}

export function ResultsSummaryHeader({
  providerName,
  industrySegment,
  expertiseLevel,
  totalQuestions,
  correctQuestions,
  scorePercentage,
  overallRating,
  isPassed,
}: ResultsSummaryHeaderProps) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        {/* Provider Context Strip */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{providerName || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{industrySegment || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span>{expertiseLevel || '—'}</span>
          </div>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total Questions */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{totalQuestions}</p>
            <p className="text-xs text-muted-foreground">Total Questions</p>
          </div>

          {/* Correct Questions */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{correctQuestions}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </div>

          {/* Score Percentage */}
          <div className={cn(
            'text-center p-3 rounded-lg',
            isPassed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          )}>
            <p className={cn(
              'text-2xl font-bold',
              isPassed ? 'text-green-600' : 'text-red-600'
            )}>
              {scorePercentage.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground">Overall Score</p>
          </div>

          {/* 1-5 Rating */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold text-foreground">{overallRating.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Rating (out of 5)</p>
          </div>

          {/* Pass/Fail Status */}
          <div className="text-center p-3 flex flex-col items-center justify-center">
            {isPassed ? (
              <>
                <Trophy className="h-6 w-6 text-green-600 mb-1" />
                <Badge className="bg-green-500 text-white">PASSED</Badge>
              </>
            ) : (
              <>
                <Target className="h-6 w-6 text-red-600 mb-1" />
                <Badge variant="destructive">BELOW THRESHOLD</Badge>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
