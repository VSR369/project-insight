/**
 * Final Result Tab Content
 * 
 * Consolidated view of a Solution Provider's evaluation progress
 * and final certification outcome for reviewers.
 */

import { useEffect } from 'react';
import {
  User,
  Building2,
  GraduationCap,
  FileCheck,
  ClipboardCheck,
  Calendar,
  Award,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useFinalResultData } from '@/hooks/queries/useFinalResultData';
import { LifecycleStageCard } from './LifecycleStageCard';
import { ScoreSummaryTile } from './ScoreSummaryTile';
import { CompositeScoreBanner } from './CompositeScoreBanner';

interface FinalResultTabContentProps {
  enrollmentId: string;
}

export function FinalResultTabContent({ enrollmentId }: FinalResultTabContentProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useFinalResultData(enrollmentId);

  // Show info toast if composite is incomplete
  useEffect(() => {
    if (data && !data.isCompositeComplete) {
      toast.info(
        'Composite score will be available once all required evaluation stages are completed.',
        { duration: 5000 }
      );
    }
  }, [data?.isCompositeComplete]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Unable to load final result data</AlertTitle>
        <AlertDescription className="mt-2">
          {error instanceof Error ? error.message : 'An unexpected error occurred.'}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => navigate('/reviewer/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Final Result</CardTitle>
          <CardDescription>
            Composite assessment with certification determination for {data.providerName}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Score Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Proof Points Score */}
        <ScoreSummaryTile
          title="Proof Points"
          score={data.scores.proofPointsScore}
          maxScore={data.scores.proofPointsMax}
          percentage={data.scores.proofPointsScore !== null ? (data.scores.proofPointsScore / 10) * 100 : null}
          isPending={data.scores.proofPointsScore === null}
          icon={<FileCheck className="h-5 w-5" />}
        />

        {/* Assessment Score */}
        <ScoreSummaryTile
          title="Assessment Score"
          score={data.scores.assessmentScore}
          maxScore={data.scores.assessmentMax ?? 50}
          percentage={data.scores.assessmentPercentage}
          isPending={data.scores.assessmentScore === null}
          icon={<ClipboardCheck className="h-5 w-5" />}
        />

        {/* Interview Score */}
        <ScoreSummaryTile
          title="Interview Score"
          score={data.scores.interviewScore}
          maxScore={data.scores.interviewMax}
          percentage={data.scores.interviewScore !== null ? (data.scores.interviewScore / 10) * 100 : null}
          isPending={data.scores.interviewScore === null}
          icon={<Calendar className="h-5 w-5" />}
        />

        {/* Composite Score (Mini view for the row) */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <Award className="h-5 w-5" />
              </span>
            </div>
            <h4 className="text-sm font-medium mb-1">Composite</h4>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">
                {data.compositeScore !== null ? `${data.compositeScore.toFixed(1)}%` : '—'}
              </span>
            </div>
            <p className="text-xs mt-1 text-muted-foreground">
              {data.isCompositeComplete ? 'Final score' : 'Incomplete'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Composite Score Banner */}
      <CompositeScoreBanner
        compositeScore={data.compositeScore}
        isComplete={data.isCompositeComplete}
        certificationOutcome={data.certificationOutcome}
      />

      <Separator />

      {/* Review Checklist Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Checklist</CardTitle>
          <CardDescription>
            Track progress across all provider evaluation stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Provider Details */}
            <LifecycleStageCard
              icon={<User className="h-4 w-4" />}
              title="Provider Details"
              status={data.stages.providerDetails}
              description={data.stageDescriptions.providerDetails}
            />

            {/* Organization Information */}
            <LifecycleStageCard
              icon={<Building2 className="h-4 w-4" />}
              title="Organization Info"
              status={data.stages.organizationInfo}
              description={data.stageDescriptions.organizationInfo}
              notApplicable={!data.requiresOrgInfo}
            />

            {/* Expertise Level */}
            <LifecycleStageCard
              icon={<GraduationCap className="h-4 w-4" />}
              title="Expertise Level"
              status={data.stages.expertiseLevel}
              description={data.stageDescriptions.expertiseLevel}
            />

            {/* Proof Points */}
            <LifecycleStageCard
              icon={<FileCheck className="h-4 w-4" />}
              title="Proof Points"
              status={data.stages.proofPoints}
              description={data.stageDescriptions.proofPoints}
            />

            {/* Knowledge Assessment */}
            <LifecycleStageCard
              icon={<ClipboardCheck className="h-4 w-4" />}
              title="Knowledge Assessment"
              status={data.stages.knowledgeAssessment}
              description={data.stageDescriptions.knowledgeAssessment}
            />

            {/* Interview Slot */}
            <LifecycleStageCard
              icon={<Calendar className="h-4 w-4" />}
              title="Interview Slot"
              status={data.stages.interviewSlot}
              description={data.stageDescriptions.interviewSlot}
            />

            {/* Certification Status */}
            <LifecycleStageCard
              icon={<Award className="h-4 w-4" />}
              title="Certification Status"
              status={data.stages.certificationStatus}
              description={data.stageDescriptions.certificationStatus}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
