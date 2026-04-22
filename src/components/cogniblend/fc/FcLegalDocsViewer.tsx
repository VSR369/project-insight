import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, FileWarning, RefreshCcw, Scale } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { useFcLegalAgreement } from '@/hooks/cogniblend/useFcLegalAgreement';

interface FcLegalDocsViewerProps {
  challengeId: string;
}

interface QueryErrorWithCorrelation extends Error {
  correlationId?: string;
}

export function FcLegalDocsViewer({ challengeId }: FcLegalDocsViewerProps) {
  const { data, error, isLoading, refetch, isRefetching } = useFcLegalAgreement(challengeId);
  const queryError = error as QueryErrorWithCorrelation | null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Scale className="h-4 w-4 text-primary" />
          Legal Agreement
          {data && (
            <Badge variant="outline" className="ml-auto">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Approved by Legal Coordinator
              {data.lc_reviewed_at && (
                <span className="ml-1 font-normal">· {format(new Date(data.lc_reviewed_at), 'MMM d, yyyy')}</span>
              )}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}

        {!isLoading && queryError && (
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-foreground">Could not load the legal agreement</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Retry the fetch. Reference ID: {queryError.correlationId ?? 'unavailable'}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => void refetch()} disabled={isRefetching}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !queryError && !data && (
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-6 text-center">
            <FileWarning className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Legal documents are being reviewed</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              The Legal Coordinator has not yet finalised the unified agreement. You will see the full document here once it is approved.
            </p>
          </div>
        )}

        {!isLoading && !queryError && data && (
          <LegalDocumentViewer
            content={data.ai_modified_content_html ?? data.content_html ?? ''}
            className="max-h-[480px] rounded-md border bg-background"
          />
        )}
      </CardContent>
    </Card>
  );
}

export default FcLegalDocsViewer;
