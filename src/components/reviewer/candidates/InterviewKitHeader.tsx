/**
 * Interview Kit Header Component
 * Displays score summary, progress, and recommendation
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, HelpCircle, BarChart3, Target, Layers, Award } from "lucide-react";
import {
  INTERVIEW_RATING_POINTS,
  RECOMMENDATION_CONFIG,
  RecommendationLevel,
  InterviewRating,
} from "@/constants/interview-kit-scoring.constants";

interface InterviewKitHeaderProps {
  totalQuestions: number;
  ratedQuestions: number;
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
  recommendation: RecommendationLevel;
  ratingDistribution: {
    right: number;
    wrong: number;
    not_answered: number;
  };
}

export function InterviewKitHeader({
  totalQuestions,
  ratedQuestions,
  earnedPoints,
  maxPoints,
  percentage,
  recommendation,
  ratingDistribution,
}: InterviewKitHeaderProps) {
  const recConfig = RECOMMENDATION_CONFIG[recommendation];
  const progressPercent = totalQuestions > 0 ? (ratedQuestions / totalQuestions) * 100 : 0;

  const totalRated = ratingDistribution.right + ratingDistribution.wrong + ratingDistribution.not_answered;
  const rightPercent = totalRated > 0 ? (ratingDistribution.right / totalRated) * 100 : 0;
  const wrongPercent = totalRated > 0 ? (ratingDistribution.wrong / totalRated) * 100 : 0;
  const notAnsweredPercent = totalRated > 0 ? (ratingDistribution.not_answered / totalRated) * 100 : 0;

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        {/* Top Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />
              <span>Progress</span>
            </div>
            <div className="text-2xl font-semibold">
              {ratedQuestions}/{totalQuestions}
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </div>

          {/* Total Score */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="h-4 w-4" />
              <span>Total Score</span>
            </div>
            <div className="text-2xl font-semibold">
              {earnedPoints}/{maxPoints}
            </div>
            <div className="text-xs text-muted-foreground">
              {percentage.toFixed(1)}%
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Layers className="h-4 w-4" />
              <span>Sections</span>
            </div>
            <div className="text-2xl font-semibold">7</div>
            <div className="text-xs text-muted-foreground">
              Interview categories
            </div>
          </div>

          {/* Recommendation */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Award className="h-4 w-4" />
              <span>Recommendation</span>
            </div>
            <Badge className={`${recConfig.bgColor} ${recConfig.color} border-0`}>
              {recConfig.label}
            </Badge>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="pt-2 border-t border-border/50">
          <div className="text-sm text-muted-foreground mb-2">
            Rating Distribution (Overall Interview)
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Right</span>
              <span className="text-sm text-muted-foreground">
                {rightPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Wrong</span>
              <span className="text-sm text-muted-foreground">
                {wrongPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Not Answered</span>
              <span className="text-sm text-muted-foreground">
                {notAnsweredPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
