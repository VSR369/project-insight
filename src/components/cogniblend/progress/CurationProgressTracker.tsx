/**
 * CurationProgressTracker — Orchestrator composing ProgressStepper + ProgressDetailCard.
 * Uses useCurationProgress for live Realtime data.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity } from 'lucide-react';
import { useCurationProgress } from '@/hooks/cogniblend/useCurationProgress';
import { ProgressStepper } from './ProgressStepper';
import { ProgressDetailCard } from './ProgressDetailCard';

interface CurationProgressTrackerProps {
  challengeId: string;
}

export function CurationProgressTracker({ challengeId }: CurationProgressTrackerProps) {
  const { data: progress, isLoading } = useCurationProgress(challengeId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          Curation in Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressStepper status={progress?.status} />
        <ProgressDetailCard progress={progress ?? null} />
      </CardContent>
    </Card>
  );
}
