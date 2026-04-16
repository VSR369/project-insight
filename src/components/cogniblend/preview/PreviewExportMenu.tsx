/**
 * PreviewExportMenu — Dropdown that exports the current preview as PDF or DOCX.
 */

import { useState } from 'react';
import { Download, FileText, FileType, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildChallengeExportHtml } from '@/lib/cogniblend/preview/buildExportHtml';
import { exportAsPdf, exportAsDocx } from '@/lib/cogniblend/preview/exportChallengeDocument';
import type { ChallengeData, LegalDocDetail, EscrowRecord } from '@/lib/cogniblend/curationTypes';
import type { OrgData, DigestData, PreviewAttachment } from './usePreviewData';

interface PreviewExportMenuProps {
  challenge: ChallengeData;
  orgData: OrgData | null;
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;
  digest: DigestData | null;
  attachments: PreviewAttachment[];
}

type ExportFormat = 'pdf' | 'docx';

export function PreviewExportMenu({
  challenge,
  orgData,
  legalDetails,
  escrowRecord,
  digest,
  attachments,
}: PreviewExportMenuProps) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    if (busy) return;
    setBusy(format);
    const toastId = toast.loading(`Generating ${format.toUpperCase()}…`);
    try {
      const html = buildChallengeExportHtml({
        challenge,
        orgData,
        legalDetails,
        escrowRecord,
        digest,
        attachments,
      });
      const baseName = `${challenge.title}_${new Date().toISOString().slice(0, 10)}`;
      if (format === 'pdf') {
        await exportAsPdf(html, baseName);
      } else {
        await exportAsDocx(html, baseName);
      }
      toast.success(`${format.toUpperCase()} downloaded`, { id: toastId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(`Export failed: ${msg}`, { id: toastId });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" disabled={!!busy} className="print:hidden">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="ml-1">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={!!busy}>
          <FileText className="h-4 w-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('docx')} disabled={!!busy}>
          <FileType className="h-4 w-4 mr-2" />
          Download Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
