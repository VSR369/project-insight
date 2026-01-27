/**
 * Interview Kit Score Header
 * Displays progress, total score, sections count, and recommendation badge
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, MinusCircle, LayoutGrid } from "lucide-react";
import { RECOMMENDATION_THRESHOLDS, type RecommendationType } from "@/constants/interview-kit-reviewer.constants";
import type { InterviewScoreResult } from "@/services/interviewKitGenerationService";

interface InterviewKitScoreHeaderProps {
  score: InterviewScoreResult;
  sectionsCount: number;
}

export function InterviewKitScoreHeader({ score, sectionsCount }: InterviewKitScoreHeaderProps) {
  const {
    totalQuestions,
    ratedCount,
    rightCount,
    wrongCount,
    notAnsweredCount,
    totalScore,
    maxPossibleScore,
    scorePercentage,
    recommendation,
  } = score;

  const recConfig = RECOMMENDATION_THRESHOLDS[recommendation];

  // Calculate percentages for distribution
  const rightPct = totalQuestions > 0 ? (rightCount / totalQuestions) * 100 : 0;
  const wrongPct = totalQuestions > 0 ? (wrongCount / totalQuestions) * 100 : 0;
  const notAnsweredPct = totalQuestions > 0 ? (notAnsweredCount / totalQuestions) * 100 : 0;

  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Progress */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Progress</p>
            <p className="text-2xl font-bold">{ratedCount}/{totalQuestions}</p>
            <Progress value={(ratedCount / Math.max(totalQuestions, 1)) * 100} className="h-1.5" />
          </div>

          {/* Total Score */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Score</p>
            <p className="text-2xl font-bold">{totalScore}/{maxPossibleScore}</p>
            <p className="text-xs text-muted-foreground">{scorePercentage.toFixed(1)}%</p>
          </div>

          {/* Sections */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Sections</p>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-bold">{sectionsCount}</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Recommendation</p>
            <Badge 
              variant="outline" 
              className={`${recConfig.bgColor} ${recConfig.color} ${recConfig.borderColor} text-xs font-medium`}
            >
              {recConfig.label}
            </Badge>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            Rating Distribution (Overall Interview)
          </p>
          <div className="flex flex-wrap gap-6">
            {/* Right */}
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Right {rightPct.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">({rightCount})</span>
            </div>

            {/* Wrong */}
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                Wrong {wrongPct.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">({wrongCount})</span>
            </div>

            {/* Not Answered */}
            <div className="flex items-center gap-2">
              <MinusCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Not Answered {notAnsweredPct.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">({notAnsweredCount})</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
