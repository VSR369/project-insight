/**
 * PreviewLegalSection — Conditional LC section rendering.
 */

import { Badge } from '@/components/ui/badge';
import { Clock, ShieldCheck, FileText } from 'lucide-react';
import { LcStatusBadge } from '@/lib/cogniblend/curationSectionDefs';
import type { LegalDocDetail } from '@/lib/cogniblend/curationTypes';

interface PreviewLegalSectionProps {
  legalDetails: LegalDocDetail[];
  lcComplete: boolean;
  isControlled: boolean;
}

export function PreviewLegalSection({ legalDetails, lcComplete, isControlled }: PreviewLegalSectionProps) {
  if (!isControlled) {
    return (
      <div className="flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-sm text-emerald-700">Curator-reviewed — legal documents managed in Phase 2.</p>
      </div>
    );
  }

  if (!lcComplete) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/30 p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <Clock className="h-4 w-4" />
          <span className="font-medium text-sm">Legal Review Pending</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Legal Coordinator has not yet completed the document review for this CONTROLLED governance challenge.
        </p>
      </div>
    );
  }

  if (legalDetails.length === 0) {
    return <p className="text-sm text-muted-foreground">No legal documents found.</p>;
  }

  return (
    <div className="space-y-2">
      {legalDetails.map((doc) => (
        <div key={doc.id} className="border border-border rounded-md p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium truncate">{doc.document_name || doc.document_type}</span>
            <Badge variant="secondary" className="text-[10px] shrink-0">{doc.tier.replace('_', ' ')}</Badge>
          </div>
          <LcStatusBadge status={doc.lc_status} />
        </div>
      ))}
    </div>
  );
}
