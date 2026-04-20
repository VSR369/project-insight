/**
 * LcFullChallengePreview — Read-only PreviewDocument wrapper for the LC.
 *
 * S7A-2: Replaces the narrow LcChallengeDetailsCard with the same 33-section
 * preview Curator/Creator already see. Sourced from usePreviewData (via
 * useChallengeForLC) so LC gets references, attachments, digest, org context,
 * legal docs, escrow — everything — with zero duplication.
 */
import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { PreviewDocument } from '@/components/cogniblend/preview/PreviewDocument';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import { Skeleton } from '@/components/ui/skeleton';

interface LcFullChallengePreviewProps {
  challengeId: string;
  /** Defaults to true (LC needs the full spec to write legal). */
  defaultOpen?: boolean;
}

export function LcFullChallengePreview({
  challengeId,
  defaultOpen = true,
}: LcFullChallengePreviewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const data = usePreviewData(challengeId);

  if (data.isLoading) {
    return (
      <Card>
        <CardContent className="py-6 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.isError || !data.challenge) {
    return null;
  }

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-0 h-auto hover:bg-transparent"
              aria-expanded={open}
            >
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Curated Challenge — Read Only
                <Badge variant="outline" className="text-[10px] ml-1">
                  Full specification
                </Badge>
              </CardTitle>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-2">
            <PreviewDocument
              challenge={data.challenge}
              orgData={data.orgData}
              legalDetails={data.legalDetails}
              escrowRecord={data.escrowRecord}
              digest={data.digest}
              attachments={data.attachments}
              canEditSection={() => false}
              isGlobalReadOnly
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default LcFullChallengePreview;
