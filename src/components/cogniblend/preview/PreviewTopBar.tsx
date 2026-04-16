/**
 * PreviewTopBar — Sticky header for the Challenge Preview Page.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PreviewExportMenu } from './PreviewExportMenu';
import type { ChallengeData, LegalDocDetail, EscrowRecord } from '@/lib/cogniblend/curationTypes';
import type { OrgData, DigestData, PreviewAttachment } from './usePreviewData';

interface PreviewTopBarProps {
  challengeId: string;
  title: string;
  isReadOnly: boolean;
  governanceMode: string | null;
  challenge: ChallengeData;
  orgData: OrgData | null;
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;
  digest: DigestData | null;
  attachments: PreviewAttachment[];
}

export function PreviewTopBar({
  challengeId,
  title,
  isReadOnly,
  governanceMode,
  challenge,
  orgData,
  legalDetails,
  escrowRecord,
  digest,
  attachments,
}: PreviewTopBarProps) {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-6 py-3 flex items-center gap-3 print:hidden">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/cogni/curation/${challengeId}`)}>
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Curation
      </Button>
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {governanceMode && (
          <Badge variant="outline" className="text-[10px] uppercase">{governanceMode}</Badge>
        )}
        {isReadOnly && (
          <Badge variant="secondary" className="text-[10px]">
            <Lock className="h-3 w-3 mr-1" />Read-only
          </Badge>
        )}
        <PreviewExportMenu
          challenge={challenge}
          orgData={orgData}
          legalDetails={legalDetails}
          escrowRecord={escrowRecord}
          digest={digest}
          attachments={attachments}
        />
      </div>
    </div>
  );
}

