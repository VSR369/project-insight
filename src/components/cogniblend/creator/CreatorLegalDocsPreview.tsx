/**
 * CreatorLegalDocsPreview — Read-only preview of legal document templates
 * that apply to the current governance mode and engagement model.
 */

import { useState } from 'react';
import { FileCheck, Shield, Eye, Loader2, AlertTriangle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { useLegalDocTemplates } from '@/hooks/queries/useLegalDocTemplates';
import type { GovernanceMode } from '@/lib/governanceMode';

interface CreatorLegalDocsPreviewProps {
  engagementModel: string;
  governanceMode: GovernanceMode;
}

export function CreatorLegalDocsPreview({
  engagementModel,
  governanceMode,
}: CreatorLegalDocsPreviewProps) {
  const {
    data: docs = [],
    isLoading,
    isError,
  } = useLegalDocTemplates(governanceMode, engagementModel);

  const [viewingDoc, setViewingDoc] = useState<{
    name: string;
    content: string;
  } | null>(null);

  const isQuick = governanceMode === 'QUICK';

  /* ── Loading state ──────────────────────────── */
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading legal templates…
      </div>
    );
  }

  /* ── Error state ────────────────────────────── */
  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex items-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Unable to load legal templates. Please try again later.
      </div>
    );
  }

  /* ── Empty state ────────────────────────────── */
  if (docs.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        No legal templates match the current governance mode (
        {governanceMode}) and engagement model ({engagementModel}).
      </div>
    );
  }

  /* ── Success state ──────────────────────────── */
  return (
    <>
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            Legal Templates {isQuick ? '(Auto-Applied)' : '(Required)'}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          {isQuick
            ? 'Standard platform agreements will be auto-applied on submission.'
            : 'These agreements will be presented for acceptance during the challenge lifecycle.'}
        </p>

        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li key={doc.template_id} className="flex items-center gap-2">
              <FileCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs text-foreground">
                {doc.document_name}
              </span>
              {doc.content && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setViewingDoc({
                      name: doc.document_name,
                      content: doc.content ?? '',
                    })
                  }
                >
                  <Eye className="h-3 w-3 mr-0.5" />
                  View
                </Button>
              )}
              <Badge
                variant="outline"
                className="ml-auto text-[9px] px-1.5 py-0 text-emerald-700 border-emerald-300 bg-emerald-50"
              >
                {isQuick
                  ? 'Auto-accepted'
                  : doc.is_mandatory
                    ? 'Mandatory'
                    : 'Optional'}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {viewingDoc && (
        <Dialog open onOpenChange={() => setViewingDoc(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>{viewingDoc.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <LegalDocumentViewer content={viewingDoc.content} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
