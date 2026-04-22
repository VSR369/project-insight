/**
 * CuratorComplianceTab — STRUCTURED-path workspace where the Curator
 * performs both legal and financial compliance work in-page.
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
import { EscrowInstallmentWorkspace } from '@/components/cogniblend/escrow/EscrowInstallmentWorkspace';
import { useCompleteCuratorCompliance } from '@/hooks/cogniblend/useCompleteCuratorCompliance';
import { useAttachedLegalDocs } from '@/hooks/cogniblend/useLcLegalData';
import { useLcLegalActions } from '@/hooks/cogniblend/useLcLegalActions';
import { useLcPass3Review } from '@/hooks/cogniblend/useLcPass3Review';
import { useSeedDefaultLegalDocs } from '@/hooks/cogniblend/useSeedDefaultLegalDocs';
import { useEscrowFundingContext } from '@/hooks/cogniblend/useEscrowFundingContext';

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

export function CuratorComplianceTab({ challengeId, userId, operatingModel, governanceMode, cuComplianceMode, lcComplete, fcComplete, creatorApprovalStatus, maturityLevel }: CuratorComplianceTabProps) {
  const [activeTab, setActiveTab] = useState<'legal' | 'finance'>('legal');
  const completeMut = useCompleteCuratorCompliance(challengeId);
  const { data: attachedDocs, isLoading: attachedLoading } = useAttachedLegalDocs(challengeId);
  const review = useLcPass3Review(challengeId);
  const actions = useLcLegalActions({ challengeId, userId, maturityLevel });
  const seedDefaultDocs = useSeedDefaultLegalDocs();
  const fundingContextQuery = useEscrowFundingContext(challengeId);

  useEffect(() => {
    if (governanceMode !== 'STRUCTURED' || !cuComplianceMode || attachedLoading || (attachedDocs?.length ?? 0) > 0 || seedDefaultDocs.isPending || seedDefaultDocs.isSuccess) return;
    seedDefaultDocs.mutate({ challengeId, userId });
  }, [attachedDocs?.length, attachedLoading, challengeId, cuComplianceMode, governanceMode, seedDefaultDocs, userId]);

  if (governanceMode !== 'STRUCTURED' || !cuComplianceMode) return null;

  const bothComplete = lcComplete && fcComplete;
  const isAwaitingDownstream = bothComplete && (creatorApprovalStatus === 'pending' || creatorApprovalStatus === 'approved');
  const canSubmitCompliance = fundingContextQuery.data
    ? (fundingContextQuery.data.installments.length > 0 ? fundingContextQuery.data.aggregate.status === 'FUNDED' : fundingContextQuery.data.legacyEscrowStatus === 'FUNDED')
    : false;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Curator Compliance Workspace
          <Badge variant="outline" className="ml-auto text-xs">{operatingModel} · {governanceMode}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">You own legal and financial review for this challenge</AlertTitle>
          <AlertDescription className="text-xs">Upload source legal documents, run Pass 3 to generate the unified agreement, and fund the escrow schedule.</AlertDescription>
        </Alert>
        {isAwaitingDownstream ? <Alert className="border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"><ShieldCheck className="h-4 w-4 text-emerald-600" /><AlertTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Compliance complete</AlertTitle><AlertDescription className="text-xs text-emerald-800 dark:text-emerald-300">{creatorApprovalStatus === 'pending' ? 'Pack forwarded — waiting for Creator approval.' : 'Pack approved — challenge advancing to publication.'}</AlertDescription></Alert> : null}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'legal' | 'finance')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="legal" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Legal Review</TabsTrigger>
            <TabsTrigger value="finance" className="gap-1.5"><Banknote className="h-3.5 w-3.5" />Financial Review</TabsTrigger>
          </TabsList>
          <TabsContent value="legal" className="space-y-3 pt-3">
            <LcSourceDocUpload challengeId={challengeId} sourceOrigin="curator" onRunPass3={review.isPass3Accepted ? undefined : review.runPass3} onOrganizeOnly={review.isPass3Accepted ? undefined : review.organizeOnly} isRunningPass3={review.isRunning} isOrganizing={review.isOrganizing} hasGenerated={review.pass3Status !== 'idle'} hasDraft={review.pass3Status !== 'idle' && !review.isPass3Accepted} />
            <LcPass3ReviewPanel review={review} />
            <LcAttachedDocsCard docs={attachedDocs} isLoading={attachedLoading} currentUserId={userId} onDelete={(id) => actions.deleteDocMutation.mutate(id)} isDeleting={actions.deleteDocMutation.isPending} />
          </TabsContent>
          <TabsContent value="finance" className="space-y-3 pt-3">
            <RecommendedEscrowCard challengeId={challengeId} />
            <EscrowInstallmentWorkspace challengeId={challengeId} userId={userId} fundingRole="CU" isReadOnly={fcComplete} />
          </TabsContent>
        </Tabs>
        <div className="flex justify-end border-t pt-2">
          <Button onClick={() => completeMut.mutate(userId)} disabled={completeMut.isPending || isAwaitingDownstream || !canSubmitCompliance}>
            {completeMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {isAwaitingDownstream ? 'Compliance Complete' : 'Submit Compliance & Forward'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
