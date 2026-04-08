/**
 * QuickLegalDocsSummary — Pre-submit read-only card showing
 * which platform legal templates will be auto-applied for QUICK mode.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, Eye, FileCheck, Info, Loader2, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { useLegalDocTemplates } from '@/hooks/queries/useLegalDocTemplates';

interface QuickLegalDocsSummaryProps {
  engagementModel: string;
}

interface QuickLegalDocTemplate {
  code: string;
  label: string;
}

interface QuickLegalDocItem {
  content: string | null;
  document_code: string | null;
  document_name: string;
  template_id: string;
}

const QUICK_LEGAL_DOCS: QuickLegalDocTemplate[] = [
  { code: 'PMA', label: 'Platform Membership Agreement' },
  { code: 'CA', label: 'Confidentiality Agreement' },
  { code: 'PSA', label: 'Professional Services Agreement' },
  { code: 'IPAA', label: 'IP Assignment Agreement' },
];

const QUICK_LEGAL_DOC_ORDER = QUICK_LEGAL_DOCS.map((doc) => doc.code);

function sortQuickLegalDocs(a: QuickLegalDocItem, b: QuickLegalDocItem): number {
  const aIndex = QUICK_LEGAL_DOC_ORDER.indexOf(a.document_code ?? '');
  const bIndex = QUICK_LEGAL_DOC_ORDER.indexOf(b.document_code ?? '');
  const safeAIndex = aIndex === -1 ? QUICK_LEGAL_DOC_ORDER.length : aIndex;
  const safeBIndex = bIndex === -1 ? QUICK_LEGAL_DOC_ORDER.length : bIndex;
  return safeAIndex - safeBIndex;
}

export function QuickLegalDocsSummary({ engagementModel }: QuickLegalDocsSummaryProps) {
  const {
    data: liveDocs = [],
    isError,
    isLoading,
  } = useLegalDocTemplates('QUICK', engagementModel);
  const [viewingDoc, setViewingDoc] = useState<{
    content: string;
    name: string;
  } | null>(null);

  const docs = useMemo<QuickLegalDocItem[]>(() => {
    if (liveDocs.length > 0) {
      return liveDocs
        .map((doc) => ({
          content: doc.content,
          document_code: doc.document_code,
          document_name: doc.document_name,
          template_id: doc.template_id,
        }))
        .sort(sortQuickLegalDocs);
    }

    return QUICK_LEGAL_DOCS.map((doc) => ({
      content: null,
      document_code: doc.code,
      document_name: doc.label,
      template_id: `quick-${engagementModel}-${doc.code}`,
    }));
  }, [engagementModel, liveDocs]);

  const status = isLoading
    ? {
        icon: Loader2,
        message: 'Loading the current platform templates…',
      }
    : isError
      ? {
          icon: AlertTriangle,
          message: 'Showing the standard Quick-mode agreements while live templates retry.',
        }
      : liveDocs.length === 0
        ? {
            icon: Info,
            message: 'Showing the standard Quick-mode agreements for this submission.',
          }
        : {
            icon: Info,
            message: 'Review the current read-only agreement text before publishing.',
          };

  const StatusIcon = status.icon;

  return (
    <>
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Legal Templates (Read-Only)</span>
        </div>

        <p className="text-xs text-muted-foreground">
          Standard platform agreements will be auto-applied on submission. These remain read-only in Quick mode.
        </p>

        <div className="flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
          <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{status.message}</span>
        </div>

        <ul className="space-y-1.5">
          {docs.map((doc) => (
            <li key={doc.template_id} className="flex items-center gap-2">
              <FileCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground">{doc.document_name}</span>
              {doc.content && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setViewingDoc({
                      content: doc.content ?? '',
                      name: doc.document_name,
                    })
                  }
                >
                  <Eye className="h-3 w-3 mr-0.5" />
                  View
                </Button>
              )}
              <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0">
                Auto-accepted
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
