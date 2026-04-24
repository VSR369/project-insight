/**
 * QuickReviewPage — /cogni/q/:challengeId/review
 *
 * Creator-only, simple Accept / Decline review surface for QUICK challenges.
 * No abstract step, no rubric scoring, no ER/CU chrome. The page composes
 * the QuickReview hook and the QuickSubmissionDetail component.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Shield, AlertTriangle } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { useUserChallengeRoles } from '@/hooks/cogniblend/useUserChallengeRoles';
import { useQuickReviewData } from '@/hooks/cogniblend/useQuickReview';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ENGAGEMENT_LABELS, type EngagementCode } from '@/constants/solverRouting.constants';
import { QuickSubmissionList } from '@/components/cogniblend/quickReview/QuickSubmissionList';
import { QuickSubmissionDetail } from '@/components/cogniblend/quickReview/QuickSubmissionDetail';

export default function QuickReviewPage() {
  // ═══ SECTION 1: useState ═══
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ═══ SECTION 2: Context & hooks ═══
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ═══ SECTION 3: Queries ═══
  const { data: roles } = useUserChallengeRoles(user?.id, challengeId);
  const { data, isLoading, error, refetch } = useQuickReviewData(challengeId);

  // ═══ SECTION 4: Derived ═══
  const hasCRRole = roles?.includes('CR') ?? false;
  const selected = data?.submissions.find((s) => s.id === selectedId) ?? data?.submissions[0] ?? null;
  const engagementCode: EngagementCode =
    data?.challenge.operatingModel === 'AGG' ? 'AGG' : 'MP';

  // ═══ SECTION 5: Conditional returns ═══
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[420px]" />
          <div className="lg:col-span-2"><Skeleton className="h-[420px]" /></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-foreground">Failed to load submissions.</p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
              <Button variant="ghost" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasCRRole) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center space-y-3">
            <Shield className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-medium text-foreground">Access Denied</p>
            <p className="text-xs text-muted-foreground">
              Only the Challenge Creator can review submissions for QUICK challenges.
            </p>
            <Button variant="outline" onClick={() => navigate('/cogni/my-challenges')}>
              Back to My Challenges
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ═══ SECTION 7: Render ═══
  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/cogni/my-challenges')} className="self-start">
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg lg:text-xl font-bold text-foreground truncate">{data.challenge.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="border-border bg-muted text-foreground">
              {ENGAGEMENT_LABELS[engagementCode]}
            </Badge>
            <Badge variant="secondary">QUICK</Badge>
            <span className="text-xs text-muted-foreground">
              {data.submissions.length} submission{data.submissions.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      {data.submissions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Inbox className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">No submissions yet</p>
            <p className="text-xs text-muted-foreground">
              Solution Providers haven't submitted to this challenge. You'll be notified when the first submission arrives.
            </p>
            <Button variant="outline" onClick={() => navigate('/cogni/my-challenges')}>
              Back to My Challenges
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-1">
            <QuickSubmissionList
              submissions={data.submissions}
              selectedId={selected?.id ?? null}
              onSelect={setSelectedId}
            />
          </div>
          <div className="lg:col-span-2 min-w-0">
            {selected ? (
              <QuickSubmissionDetail
                submission={selected}
                challengeId={data.challenge.challengeId}
                engagementCode={engagementCode}
                userId={user?.id ?? ''}
              />
            ) : (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a submission.</CardContent></Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
