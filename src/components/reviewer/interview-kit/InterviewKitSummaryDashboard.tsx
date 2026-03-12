/**
 * Interview Kit Summary Dashboard
 * 
 * Displays real-time statistics, rating distribution, scoring logic reference,
 * and auto-derived recommendation status for the interview evaluation.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle, Info } from "lucide-react";

interface InterviewKitSummaryDashboardProps {
  totalQuestions: number;
  ratedQuestions: number;
  totalScore: number;
  maxScore: number;
  sectionsCount: number;
  rightCount: number;
  wrongCount: number;
  notAnsweredCount: number;
}

function getRecommendation(scorePercentage: number): {
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'info';
} {
  if (scorePercentage >= 80) {
    return { label: 'Strong Recommend', variant: 'success' };
  } else if (scorePercentage >= 60) {
    return { label: 'Recommend with Conditions', variant: 'info' };
  } else if (scorePercentage >= 50) {
    return { label: 'Borderline / Re-interview', variant: 'warning' };
  } else {
    return { label: 'Not Recommended', variant: 'danger' };
  }
}

function getRecommendationStyles(variant: 'success' | 'warning' | 'danger' | 'info') {
  switch (variant) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-700';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-700';
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-700';
    case 'danger':
      return 'bg-red-50 border-red-200 text-red-700';
  }
}

export function InterviewKitSummaryDashboard({
  totalQuestions,
  ratedQuestions,
  totalScore,
  maxScore,
  sectionsCount,
  rightCount,
  wrongCount,
  notAnsweredCount,
}: InterviewKitSummaryDashboardProps) {
  const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const recommendation = getRecommendation(scorePercentage);

  // Calculate percentages for distribution
  const rightPercent = totalQuestions > 0 ? (rightCount / totalQuestions) * 100 : 0;
  const wrongPercent = totalQuestions > 0 ? (wrongCount / totalQuestions) * 100 : 0;
  const notAnsweredPercent = totalQuestions > 0 ? (notAnsweredCount / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Progress Card */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {ratedQuestions}/{totalQuestions}
            </p>
            <p className="text-xs text-muted-foreground">questions rated</p>
          </CardContent>
        </Card>

        {/* Total Score Card */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Score</p>
            <p className="text-2xl font-bold text-blue-600">
              {totalScore}/{maxScore}
            </p>
            <p className="text-xs text-muted-foreground">
              {scorePercentage.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        {/* Sections Card */}
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sections</p>
            <p className="text-2xl font-bold text-blue-600">{sectionsCount}</p>
            <p className="text-xs text-muted-foreground">interview sections</p>
          </CardContent>
        </Card>

        {/* Recommendation Card */}
        <Card className={`border ${getRecommendationStyles(recommendation.variant)}`}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
            <p className="text-lg font-bold">{recommendation.label}</p>
            <p className="text-xs text-muted-foreground">auto-derived</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution & Scoring Logic Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rating Distribution */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">Overall Interview Rating Distribution</h4>
            <div className="space-y-3">
              {/* Right */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Right</span>
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${rightPercent}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-24 text-right">
                  {rightPercent.toFixed(1)}% ({rightCount}/{totalQuestions})
                </span>
              </div>

              {/* Wrong */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Wrong</span>
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full transition-all"
                    style={{ width: `${wrongPercent}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-24 text-right">
                  {wrongPercent.toFixed(1)}% ({wrongCount}/{totalQuestions})
                </span>
              </div>

              {/* Not Answered */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-32">
                  <MinusCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">Not Answered</span>
                </div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${notAnsweredPercent}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-24 text-right">
                  {notAnsweredPercent.toFixed(1)}% ({notAnsweredCount}/{totalQuestions})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scoring Logic */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-medium mb-3">Scoring Logic</h4>
            
            <div className="space-y-3">
              {/* Rating Values */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Rating Values:</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Right = 5 points
                  </Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    Wrong = 0 points
                  </Badge>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Not Answered = 0 points
                  </Badge>
                </div>
              </div>

              {/* Panel Recommendation Thresholds */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Panel Recommendation (Auto-derived):</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span>≥ 80% = Strong Recommend</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-blue-600" />
                    <span>60-79% = Recommend w/ Conditions</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Info className="h-3 w-3 text-amber-600" />
                    <span>50-64% = Borderline / Re-interview</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    <span>&lt; 50% = Not Recommended</span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <p className="text-xs text-muted-foreground italic">
                Note: Comments are mandatory when rating a question as 'Wrong' or 'Not Answered'
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
