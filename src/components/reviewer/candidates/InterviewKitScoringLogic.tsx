/**
 * Interview Kit Scoring Logic Component
 * Visual reference for scoring rules
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import {
  INTERVIEW_RATING_POINTS,
  RECOMMENDATION_THRESHOLDS,
} from "@/constants/interview-kit-scoring.constants";

export function InterviewKitScoringLogic() {
  return (
    <Card className="border-border/50 bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          Scoring Logic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* Rating Values */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>Right = {INTERVIEW_RATING_POINTS.right} pts</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span>Wrong = {INTERVIEW_RATING_POINTS.wrong} pts</span>
          </div>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-amber-500" />
            <span>Not Answered = {INTERVIEW_RATING_POINTS.not_answered} pts</span>
          </div>
        </div>

        {/* Recommendation Thresholds */}
        <div className="pt-2 border-t border-border/50">
          <div className="text-muted-foreground mb-1">Panel Recommendation:</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="text-green-600 dark:text-green-400">
              ≥{RECOMMENDATION_THRESHOLDS.strong_recommend}% Strong Recommend
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {RECOMMENDATION_THRESHOLDS.recommend_with_conditions}-{RECOMMENDATION_THRESHOLDS.strong_recommend - 1}% Conditions
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {RECOMMENDATION_THRESHOLDS.borderline}-{RECOMMENDATION_THRESHOLDS.recommend_with_conditions - 1}% Borderline
            </span>
            <span className="text-red-600 dark:text-red-400">
              &lt;{RECOMMENDATION_THRESHOLDS.borderline}% Not Recommended
            </span>
          </div>
        </div>

        {/* Note */}
        <div className="text-xs text-muted-foreground italic">
          * Comments are mandatory for "Wrong" or "Not Answered" ratings
        </div>
      </CardContent>
    </Card>
  );
}
