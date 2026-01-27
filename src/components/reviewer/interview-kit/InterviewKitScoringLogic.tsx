/**
 * Interview Kit Scoring Logic Card
 * Displays scoring rules and recommendation thresholds
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { RATING_CONFIG, RECOMMENDATION_THRESHOLDS } from "@/constants/interview-kit-reviewer.constants";

export function InterviewKitScoringLogic() {
  return (
    <Card className="border-border/50">
      <CardHeader className="py-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          Scoring Logic
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Rating Values */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Right = <strong>5 points</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm">Wrong = <strong>0 points</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <MinusCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Not Answered = <strong>0 points</strong></span>
          </div>
        </div>

        {/* Recommendation Thresholds */}
        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            Panel Recommendation Thresholds
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`${RECOMMENDATION_THRESHOLDS.strong_recommend.bgColor} ${RECOMMENDATION_THRESHOLDS.strong_recommend.color} ${RECOMMENDATION_THRESHOLDS.strong_recommend.borderColor}`}>
              ≥80%: Strong Recommend
            </Badge>
            <Badge variant="outline" className={`${RECOMMENDATION_THRESHOLDS.recommend_with_conditions.bgColor} ${RECOMMENDATION_THRESHOLDS.recommend_with_conditions.color} ${RECOMMENDATION_THRESHOLDS.recommend_with_conditions.borderColor}`}>
              65-79%: Recommend with Conditions
            </Badge>
            <Badge variant="outline" className={`${RECOMMENDATION_THRESHOLDS.borderline.bgColor} ${RECOMMENDATION_THRESHOLDS.borderline.color} ${RECOMMENDATION_THRESHOLDS.borderline.borderColor}`}>
              50-64%: Borderline
            </Badge>
            <Badge variant="outline" className={`${RECOMMENDATION_THRESHOLDS.not_recommended.bgColor} ${RECOMMENDATION_THRESHOLDS.not_recommended.color} ${RECOMMENDATION_THRESHOLDS.not_recommended.borderColor}`}>
              &lt;50%: Not Recommended
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
