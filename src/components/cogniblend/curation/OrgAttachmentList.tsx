/**
 * OrgAttachmentList — Attachment list + upload for org profile documents.
 * Extracted from OrgContextPanel.tsx.
 */

import React from 'react';
import { FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileUploadZone } from '@/components/shared/FileUploadZone';

interface OrgAttachment {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string;
  extraction_status: string | null;
  storage_path: string;
}

interface OrgAttachmentListProps {
  attachments: OrgAttachment[];
  isReadOnly: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (att: OrgAttachment) => Promise<void>;
}

const ORG_DOC_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/webp'] as const,
  allowedExtensions: ['.pdf', '.docx', '.png', '.jpg', '.webp'] as const,
  label: 'Organization Profile Document',
};

export function OrgAttachmentList({ attachments, isReadOnly, onUpload, onDelete }: OrgAttachmentListProps) {
  return (
    <div className="space-y-2 pt-3 border-t border-border">
      <Label className="text-xs font-medium flex items-center gap-1.5">
        <FileText className="h-3 w-3" />Organization Profile Documents
      </Label>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div key={att.id} className="border rounded-md p-2 flex items-center gap-2 bg-muted/30 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-xs">{att.file_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ''}
                </p>
              </div>
              {att.extraction_status === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
              {att.extraction_status === 'failed' && <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              {!isReadOnly && (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(att)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {!isReadOnly && (
        <FileUploadZone
          config={{
            maxSizeBytes: ORG_DOC_CONFIG.maxSizeBytes,
            allowedMimeTypes: [...ORG_DOC_CONFIG.allowedTypes],
            allowedExtensions: [...ORG_DOC_CONFIG.allowedExtensions],
            label: ORG_DOC_CONFIG.label,
          }}
          onChange={(file) => { if (file) onUpload(file); }}
        />
      )}
    </div>
  );
}
