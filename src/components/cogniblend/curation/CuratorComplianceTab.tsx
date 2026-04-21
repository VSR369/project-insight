/**
 * CuratorComplianceTab — STRUCTURED-path workspace where the Curator
 * performs both legal and financial compliance work in-page.
 *
 * Unified Pass 3 flow: Source upload → Pass 3 → Attached docs.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldCheck, FileText, Banknote, Sparkles } from 'lucide-react';

import { LcAttachedDocsCard } from '@/components/cogniblend/lc/LcAttachedDocsCard';
import { LcPass3ReviewPanel } from '@/components/cogniblend/lc/LcPass3ReviewPanel';
import { LcSourceDocUpload } from '@/components/cogniblend/lc/LcSourceDocUpload';
import { RecommendedEscrowCard } from '@/components/cogniblend/fc/RecommendedEscrowCard';

import { useCompleteCuratorCompliance } from '@/hooks/cogniblend/useCompleteCuratorCompliance';
import { useAttachedLegalDocs } from '@/hooks/cogniblend/useLcLegalData';
import { useLcLegalActions } from '@/hooks/cogniblend/useLcLegalActions';
import { useLcPass3Review } from '@/hooks/cogniblend/useLcPass3Review';
import { useSourceDocs } from '@/hooks/queries/useSourceDocs';
import { supabase } from '@/integrations/supabase/client';
import { logWarning } from '@/lib/errorHandler';

interface CuratorComplianceTabProps {
  challengeId: string;
  userId: string;
  operatingModel: string | null;
  governanceMode: string;
  cuComplianceMode: boolean;
  lcComplete: boolean;
  fcComplete: boolean;
  creatorApprovalStatus: string | null;
  maturityLevel?: string | null;
}

export function CuratorComplianceTab({
  challengeId,
  userId,
  operatingModel,
  governanceMode,
  cuComplianceMode,
  lcComplete,
  fcComplete,
  creatorApprovalStatus,
  maturityLevel,
}: CuratorComplianceTabProps) {
  const [activeTab, setActiveTab] = useState<'legal' | 'finance'>('legal');
  const completeMut = useCompleteCuratorCompliance(challengeId);
  const { data: attachedDocs, isLoading: attachedLoading } = useAttachedLegalDocs(challengeId);
  const review = useLcPass3Review(challengeId);
  const { data: sourceDocs } = useSourceDocs(challengeId);
  const sourceDocCount = sourceDocs?.length ?? 0;
  const reviewBusy = review.isRunning || review.isOrganizing;

  const actions = useLcLegalActions({
    challengeId,
    userId,
    maturityLevel,
  });

  // Auto-seed default templates the first time a Structured Curator opens the tab
  useEffect(() => {
    if (governanceMode !== 'STRUCTURED' || !cuComplianceMode) return;
    if (attachedLoading) return;
    const hasAny = (attachedDocs?.length ?? 0) > 0;
    if (hasAny) return;
    supabase
      .rpc('seed_default_legal_docs', {
        p_challenge_id: challengeId,
        p_user_id: userId,
      })
      .then(({ error }) => {
        if (error) {
          logWarning('seed_default_legal_docs failed', {
            operation: 'seed_default_legal_docs',
            additionalData: { challengeId, error },
          });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    challengeId,
    userId,
    governanceMode,
    cuComplianceMode,
    attachedLoading,
    attachedDocs?.length,
  ]);

  if (governanceMode !== 'STRUCTURED' || !cuComplianceMode) {
    return null;
  }

  const bothComplete = lcComplete && fcComplete;
  const isAwaitingDownstream = bothComplete &&
    (creatorApprovalStatus === 'pending' || creatorApprovalStatus === 'approved');

  const handleSubmit = () => {
    completeMut.mutate(userId);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Curator Compliance Workspace
          <Badge variant="outline" className="ml-auto text-xs">
            {operatingModel} · {governanceMode}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            You own legal and financial review for this challenge
          </AlertTitle>
          <AlertDescription className="text-xs">
            STRUCTURED governance does not assign separate Legal or Financial
            Counsels. Upload source legal documents, run Pass 3 to generate the
            unified agreement, and confirm escrow.
          </AlertDescription>
        </Alert>

        {isAwaitingDownstream && (
          <Alert className="border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Compliance complete
            </AlertTitle>
            <AlertDescription className="text-xs text-emerald-800 dark:text-emerald-300">
              {creatorApprovalStatus === 'pending'
                ? 'Pack forwarded — waiting for Creator approval.'
                : 'Pack approved — challenge advancing to publication.'}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'legal' | 'finance')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="legal" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Legal Review
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Financial Review
            </TabsTrigger>
          </TabsList>

          <TabsContent value="legal" className="space-y-3 pt-3">
            <LcSourceDocUpload challengeId={challengeId} sourceOrigin="curator" />

            {!review.isPass3Accepted && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-3">
                <p className="text-sm font-medium text-foreground">
                  {sourceDocCount > 0
                    ? `${sourceDocCount} source document${sourceDocCount === 1 ? '' : 's'} ready to process`
                    : 'No source documents — AI will draft from challenge context'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={review.runPass3}
                    disabled={reviewBusy}
                    className="gap-1.5"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Run AI Pass 3 (Merge + Enhance)
                  </Button>
                  {sourceDocCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={review.organizeOnly}
                      disabled={reviewBusy}
                      className="gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Organize &amp; Merge (No AI)
                    </Button>
                  )}
                </div>
              </div>
            )}

            <LcPass3ReviewPanel challengeId={challengeId} />
            <LcAttachedDocsCard
              docs={attachedDocs}
              isLoading={attachedLoading}
              currentUserId={userId}
              onDelete={(id) => actions.deleteDocMutation.mutate(id)}
              isDeleting={actions.deleteDocMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="finance" className="space-y-3 pt-3">
            <RecommendedEscrowCard challengeId={challengeId} />
            <p className="text-xs text-muted-foreground">
              Confirm the escrow deposit on the Escrow Management page, or simply
              attest below that funding is in place.
            </p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button
            onClick={handleSubmit}
            disabled={completeMut.isPending || isAwaitingDownstream}
            size="default"
          >
            {completeMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-2" />
            )}
            {isAwaitingDownstream ? 'Compliance Complete' : 'Submit Compliance & Forward'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
