/**
 * ChallengePreviewPage — Seamless document-style preview of a challenge.
 * Route: /cogni/curation/:id/preview
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import { usePreviewEditability } from '@/components/cogniblend/preview/usePreviewEditability';
import { PreviewTopBar } from '@/components/cogniblend/preview/PreviewTopBar';
import { PreviewBottomBar } from '@/components/cogniblend/preview/PreviewBottomBar';
import { PreviewSideNav } from '@/components/cogniblend/preview/PreviewSideNav';
import { PreviewDocument, PREVIEW_GROUPS } from '@/components/cogniblend/preview/PreviewDocument';
import { SECTIONS } from '@/lib/cogniblend/curationSectionDefs';

export default function ChallengePreviewPage() {
  const { id: challengeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const data = usePreviewData(challengeId);
  const { isGlobalReadOnly, canEditSection } = usePreviewEditability({
    challenge: data.challenge,
    fieldRules: data.fieldRules,
  });

  const filledCount = useMemo(() => {
    if (!data.challenge) return 0;
    return SECTIONS.filter((s) =>
      s.isFilled(data.challenge!, [], data.legalDetails, data.escrowRecord),
    ).length;
  }, [data.challenge, data.legalDetails, data.escrowRecord]);

  // Loading state
  if (data.isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto p-8 space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (data.isError || !data.challenge) {
    return (
      <div className="max-w-lg mx-auto p-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Failed to load challenge</AlertTitle>
          <AlertDescription>
            {data.error?.message ?? 'Challenge not found.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <PreviewTopBar
        challengeId={data.challenge.id}
        title={data.challenge.title}
        isReadOnly={isGlobalReadOnly}
        governanceMode={data.governanceMode}
        challenge={data.challenge}
        orgData={data.orgData}
        legalDetails={data.legalDetails}
        escrowRecord={data.escrowRecord}
        digest={data.digest}
        attachments={data.attachments}
      />

      <div className="flex-1 flex gap-8 px-6 py-6">
        <PreviewSideNav
          groups={PREVIEW_GROUPS}
          filledCount={filledCount}
          totalCount={SECTIONS.length}
        />

        <main className="flex-1 min-w-0">
          <PreviewDocument
            challenge={data.challenge}
            orgData={data.orgData}
            legalDetails={data.legalDetails}
            escrowRecord={data.escrowRecord}
            digest={data.digest}
            attachments={data.attachments}
            canEditSection={canEditSection}
            isGlobalReadOnly={isGlobalReadOnly}
          />
        </main>
      </div>

      <PreviewBottomBar
        challengeId={data.challenge.id}
        filledCount={filledCount}
        totalCount={SECTIONS.length}
      />
    </div>
  );
}
