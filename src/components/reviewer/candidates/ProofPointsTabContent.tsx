import { useState, useCallback } from "react";
import { Loader2, FileQuestion, Filter } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useCandidateProofPoints,
  useUpdateProofPointRating,
  useSaveProofPointsReviewDraft,
  useConfirmProofPointsReview,
} from "@/hooks/queries/useCandidateProofPoints";
import { calculateProofPointsScore, type RelevanceRating, type ProofPointRating } from "@/services/proofPointsScoreService";
import { ProofPointsScoreHeader } from "./ProofPointsScoreHeader";
import { ProofPointReviewCard } from "./ProofPointReviewCard";
import { ProofPointsReviewFooter } from "./ProofPointsReviewFooter";
import { toast } from "sonner";

interface ProofPointsTabContentProps {
  enrollmentId: string;
}

export function ProofPointsTabContent({ enrollmentId }: ProofPointsTabContentProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'general' | 'specialty'>('all');
  
  const { data, isLoading, error, refetch } = useCandidateProofPoints(enrollmentId);
  const updateRating = useUpdateProofPointRating();
  const saveDraft = useSaveProofPointsReviewDraft();
  const confirmReview = useConfirmProofPointsReview();

  // Local state for optimistic updates
  const [localRatings, setLocalRatings] = useState<Map<string, { 
    relevance: RelevanceRating | null; 
    score: number | null; 
    comments: string | null 
  }>>(new Map());

  const handleRelevanceChange = useCallback((proofPointId: string, value: RelevanceRating) => {
    setLocalRatings(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(proofPointId) || { relevance: null, score: null, comments: null };
      newMap.set(proofPointId, { ...existing, relevance: value });
      return newMap;
    });

    updateRating.mutate({ proofPointId, relevanceRating: value });
  }, [updateRating]);

  const handleScoreChange = useCallback((proofPointId: string, value: number) => {
    setLocalRatings(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(proofPointId) || { relevance: null, score: null, comments: null };
      newMap.set(proofPointId, { ...existing, score: value });
      return newMap;
    });

    updateRating.mutate({ proofPointId, scoreRating: value });
  }, [updateRating]);

  const handleCommentsChange = useCallback((proofPointId: string, value: string) => {
    setLocalRatings(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(proofPointId) || { relevance: null, score: null, comments: null };
      newMap.set(proofPointId, { ...existing, comments: value });
      return newMap;
    });

    updateRating.mutate({ proofPointId, comments: value });
  }, [updateRating]);

  const handleSaveDraft = useCallback(() => {
    if (!data) return;

    const ratings = data.proofPoints.map(pp => {
      const local = localRatings.get(pp.id);
      return {
        proofPointId: pp.id,
        relevanceRating: local?.relevance ?? pp.reviewRelevanceRating,
        scoreRating: local?.score ?? pp.reviewScoreRating,
        comments: local?.comments ?? pp.reviewComments,
      };
    });

    saveDraft.mutate({ enrollmentId, ratings });
  }, [data, localRatings, enrollmentId, saveDraft]);

  const handleConfirm = useCallback(() => {
    if (!data) return;

    // Calculate final score
    const ratings: ProofPointRating[] = data.proofPoints
      .map(pp => {
        const local = localRatings.get(pp.id);
        const relevance = local?.relevance ?? pp.reviewRelevanceRating;
        const score = local?.score ?? pp.reviewScoreRating;
        if (relevance && score !== null) {
          return { relevance, score };
        }
        return null;
      })
      .filter((r): r is ProofPointRating => r !== null);

    // Validate all rated
    if (ratings.length !== data.proofPoints.length) {
      toast.error('Please rate all proof points before confirming.');
      return;
    }

    const breakdown = calculateProofPointsScore(ratings);

    confirmReview.mutate({
      enrollmentId,
      finalScore: breakdown.finalScore,
    });
  }, [data, localRatings, enrollmentId, confirmReview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading proof points...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load proof points: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No data available</AlertDescription>
      </Alert>
    );
  }

  // Merge local ratings with server data for display
  const getMergedRating = (pp: typeof data.proofPoints[0]) => {
    const local = localRatings.get(pp.id);
    return {
      ...pp,
      reviewRelevanceRating: local?.relevance ?? pp.reviewRelevanceRating,
      reviewScoreRating: local?.score ?? pp.reviewScoreRating,
      reviewComments: local?.comments ?? pp.reviewComments,
    };
  };

  // Filter proof points
  const generalProofPoints = data.proofPoints.filter(pp => pp.category === 'general');
  const specialtyProofPoints = data.proofPoints.filter(pp => pp.category === 'specialty_specific');

  const filteredProofPoints = activeFilter === 'all' 
    ? data.proofPoints
    : activeFilter === 'general'
    ? generalProofPoints
    : specialtyProofPoints;

  // Calculate current score for footer
  const currentRatings: ProofPointRating[] = data.proofPoints
    .map(pp => {
      const merged = getMergedRating(pp);
      if (merged.reviewRelevanceRating && merged.reviewScoreRating !== null) {
        return { relevance: merged.reviewRelevanceRating, score: merged.reviewScoreRating };
      }
      return null;
    })
    .filter((r): r is ProofPointRating => r !== null);

  const currentBreakdown = calculateProofPointsScore(currentRatings);
  const allRated = currentRatings.length === data.proofPoints.length && data.proofPoints.length > 0;

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <ProofPointsScoreHeader
        proofPoints={data.proofPoints.map(getMergedRating)}
        reviewStatus={data.reviewStatus}
        savedFinalScore={data.finalScore}
      />

      {/* Empty State */}
      {data.proofPoints.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Proof Points</h3>
          <p className="text-sm text-muted-foreground mt-1">
            This provider has not submitted any proof points yet.
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      {data.proofPoints.length > 0 && (
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Total Proof Points
              <Badge variant="secondary">{data.proofPoints.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              General
              <Badge variant="secondary">{generalProofPoints.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="specialty" className="flex items-center gap-2">
              Speciality Linked
              <Badge variant="secondary">{specialtyProofPoints.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeFilter} className="mt-4">
            {/* Section Headers */}
            {activeFilter === 'all' && specialtyProofPoints.length > 0 && (
              <h3 className="text-lg font-semibold mb-4 text-primary">
                Speciality-Linked Proof Points ({specialtyProofPoints.length})
              </h3>
            )}

            {/* Speciality Proof Points */}
            {(activeFilter === 'all' || activeFilter === 'specialty') && 
              specialtyProofPoints.map(pp => (
                <ProofPointReviewCard
                  key={pp.id}
                  proofPoint={getMergedRating(pp)}
                  onRelevanceChange={(v) => handleRelevanceChange(pp.id, v)}
                  onScoreChange={(v) => handleScoreChange(pp.id, v)}
                  onCommentsChange={(v) => handleCommentsChange(pp.id, v)}
                  isUpdating={updateRating.isPending}
                  isCompleted={data.reviewStatus === 'completed'}
                />
              ))
            }

            {/* General Section Header */}
            {activeFilter === 'all' && generalProofPoints.length > 0 && (
              <h3 className="text-lg font-semibold mb-4 mt-6 text-primary">
                General Proof Points ({generalProofPoints.length})
              </h3>
            )}

            {/* General Proof Points */}
            {(activeFilter === 'all' || activeFilter === 'general') && 
              generalProofPoints.map(pp => (
                <ProofPointReviewCard
                  key={pp.id}
                  proofPoint={getMergedRating(pp)}
                  onRelevanceChange={(v) => handleRelevanceChange(pp.id, v)}
                  onScoreChange={(v) => handleScoreChange(pp.id, v)}
                  onCommentsChange={(v) => handleCommentsChange(pp.id, v)}
                  isUpdating={updateRating.isPending}
                  isCompleted={data.reviewStatus === 'completed'}
                />
              ))
            }
          </TabsContent>
        </Tabs>
      )}

      {/* Footer Actions */}
      {data.proofPoints.length > 0 && (
        <ProofPointsReviewFooter
          totalCount={data.totalCount}
          ratedCount={currentRatings.length}
          allRated={allRated}
          reviewStatus={data.reviewStatus}
          finalScore={currentBreakdown.finalScore}
          onSaveDraft={handleSaveDraft}
          onConfirm={handleConfirm}
          isSaving={saveDraft.isPending}
          isConfirming={confirmReview.isPending}
        />
      )}
    </div>
  );
}
