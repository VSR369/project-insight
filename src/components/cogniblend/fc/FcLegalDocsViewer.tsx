/**
 * FcLegalDocsViewer — Read-only view of the LC-approved unified legal
 * agreement (UNIFIED_SPA). FC sees what the Solution Provider will agree
 * to before confirming the escrow deposit.
 */
import { useQuery } from '@tanstack/react-query';
import { Scale, CheckCircle2, FileWarning } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { supabase } from '@/integrations/supabase/client';

interface FcLegalDocsViewerProps {
  challengeId: string;
}

interface UnifiedSpaRow {
  id: string;
  content_html: string | null;
  ai_modified_content_html: string | null;
  lc_reviewed_at: string | null;
}

export function FcLegalDocsViewer({ challengeId }: FcLegalDocsViewerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['fc-unified-spa', challengeId],
    queryFn: async (): Promise<UnifiedSpaRow | null> => {
      if (!challengeId) return null;
      const { data: row, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, content_html, ai_modified_content_html, lc_reviewed_at')
        .eq('challenge_id', challengeId)
        .eq('document_type', 'UNIFIED_SPA')
        .eq('ai_review_status', 'accepted')
        .maybeSingle();
      if (error) return null;
      return (row as UnifiedSpaRow | null) ?? null;
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          Legal Agreement (Read Only)
          {data && (
            <Badge
              variant="outline"
              className="ml-auto border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Approved by Legal Coordinator
              {data.lc_reviewed_at && (
                <span className="ml-1 font-normal">
                  · {format(new Date(data.lc_reviewed_at), 'MMM d, yyyy')}
                </span>
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

        {!isLoading && !data && (
          <div className="rounded-md border border-dashed border-border bg-muted/40 p-6 text-center">
            <FileWarning className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">
              Legal documents are being reviewed
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              The Legal Coordinator has not yet finalised the unified agreement.
              You will see the full document here once it is approved.
            </p>
          </div>
        )}

        {!isLoading && data && (
          <LegalDocumentViewer
            content={data.ai_modified_content_html ?? data.content_html ?? ''}
            className="max-h-[480px] border rounded-md bg-background"
          />
        )}
      </CardContent>
    </Card>
  );
}

export default FcLegalDocsViewer;
