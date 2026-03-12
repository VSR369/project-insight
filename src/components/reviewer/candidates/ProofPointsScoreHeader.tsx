import { Calculator, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  calculateProofPointsScore, 
  type ProofPointRating,
  formatScore
} from "@/services/proofPointsScoreService";
import type { ProofPointForReview } from "@/hooks/queries/useCandidateProofPoints";

interface ProofPointsScoreHeaderProps {
  proofPoints: ProofPointForReview[];
  reviewStatus: 'pending' | 'in_progress' | 'completed';
  savedFinalScore: number | null;
}

export function ProofPointsScoreHeader({ 
  proofPoints, 
  reviewStatus,
  savedFinalScore 
}: ProofPointsScoreHeaderProps) {
  // Calculate live score from current ratings
  const ratings: ProofPointRating[] = proofPoints
    .filter(pp => pp.reviewRelevanceRating && pp.reviewScoreRating !== null)
    .map(pp => ({
      relevance: pp.reviewRelevanceRating!,
      score: pp.reviewScoreRating!,
    }));

  const breakdown = calculateProofPointsScore(ratings);
  const ratedCount = ratings.length;
  const totalCount = proofPoints.length;
  const progressPercent = totalCount > 0 ? (ratedCount / totalCount) * 100 : 0;

  // Use saved score if completed, otherwise show live calculation
  const displayScore = reviewStatus === 'completed' && savedFinalScore !== null 
    ? savedFinalScore 
    : breakdown.finalScore;

  const notImpactfulCount = ratings.filter(r => r.score === 0).length;

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Final Score */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Final Score</span>
            </div>
            <div className="text-4xl font-bold text-primary">
              {formatScore(displayScore)}
            </div>
            <div className="text-sm text-muted-foreground">/10</div>
            {reviewStatus === 'completed' && (
              <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>

          {/* Evaluation Stats */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-3">Evaluation Progress</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Evaluated</span>
                <span className="font-medium">{ratedCount} / {totalCount}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Not Impactful (0 score)</span>
                <span>{notImpactfulCount}</span>
              </div>
            </div>
          </div>

          {/* Total Contribution */}
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Total Contribution
            </div>
            <div className="text-3xl font-bold">
              {formatScore(breakdown.totalContribution)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Quality: {formatScore(breakdown.weightedQuality)} × Density: {formatScore(breakdown.relevanceDensity)}
            </div>
          </div>
        </div>

        {/* Formula explanation */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span className="font-medium">Formula:</span> Final Score = (Weighted Quality × Relevance Density) × 10
          <span className="ml-4">|</span>
          <span className="ml-4">
            Relevance weights: High (1.0), Medium (0.6), Low (0.2)
          </span>
        </div>

        {/* Warning if not all rated */}
        {totalCount > 0 && ratedCount < totalCount && reviewStatus !== 'completed' && (
          <div className="mt-4 flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              {totalCount - ratedCount} proof point(s) still need ratings before you can confirm.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
