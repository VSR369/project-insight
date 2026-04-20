/**
 * FcChallengeDetailView — Read-only PreviewDocument wrapper for the FC.
 *
 * S7B-1: gives the Finance Coordinator the same 33-section view of the
 * curated challenge that the Curator/Creator/LC already see, so the FC
 * can confirm the deposit makes sense in context. Reuses PreviewDocument
 * (zero duplication) and forces read-only mode.
 *
 * Mirror of LcFullChallengePreview — keeps both inboxes consistent.
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
import { Skeleton } from '@/components/ui/skeleton';
import { PreviewDocument } from '@/components/cogniblend/preview/PreviewDocument';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';

interface FcChallengeDetailViewProps {
  challengeId: string;
  /** Defaults to false — FC is action-focused; opens the spec on demand. */
  defaultOpen?: boolean;
}

export function FcChallengeDetailView({
  challengeId,
  defaultOpen = false,
}: FcChallengeDetailViewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const data = usePreviewData(challengeId);

  if (data.isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <Skeleton className="h-6 w-1/3 mb-2" />
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
              <CardTitle className="text-sm flex items-center gap-2">
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

export default FcChallengeDetailView;
