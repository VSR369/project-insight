/**
 * ReferenceAttachmentsSection — File upload + reference URL input.
 * Rendered below tabs for STRUCTURED and CONTROLLED modes.
 * Extracted from AdditionalContextTab to avoid exposing CONTROLLED-only fields.
 */

import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, Link as LinkIcon } from 'lucide-react';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { toast } from 'sonner';

const ATTACHMENT_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/png', 'image/jpeg'] as readonly string[],
  allowedExtensions: ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg'] as readonly string[],
  label: 'Reference Documents',
} as const;

const MAX_FILES = 5;
const MAX_URLS = 5;

interface ReferenceAttachmentsSectionProps {
  attachedFiles: File[];
  onFilesChange: (files: File[]) => void;
  referenceUrls: string[];
  onUrlsChange: (urls: string[]) => void;
}

export function ReferenceAttachmentsSection({
  attachedFiles, onFilesChange, referenceUrls, onUrlsChange,
}: ReferenceAttachmentsSectionProps) {
  const [urlInput, setUrlInput] = useState('');

  const handleAddUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch { toast.error('Please enter a valid URL'); return; }
    if (referenceUrls.length >= MAX_URLS) { toast.error(`Maximum ${MAX_URLS} URLs allowed`); return; }
    if (referenceUrls.includes(trimmed)) { toast.error('URL already added'); return; }
    onUrlsChange([...referenceUrls, trimmed]);
    setUrlInput('');
  }, [urlInput, referenceUrls, onUrlsChange]);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Reference Documents</Label>
        <p className="text-xs text-muted-foreground">
          Upload supporting files (max {MAX_FILES}, {ATTACHMENT_CONFIG.maxSizeMB} MB each).
        </p>
        <FileUploadZone
          config={ATTACHMENT_CONFIG}
          multiple
          files={attachedFiles}
          onFilesChange={(f) => {
            if (f.length > MAX_FILES) { toast.error(`Max ${MAX_FILES} files`); return; }
            onFilesChange(f);
          }}
          onChange={() => {}}
          value={null}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          <LinkIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />Reference URLs
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="url"
            placeholder="https://example.com/reference"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
            className="flex-1 text-base"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddUrl} disabled={!urlInput.trim()}>
            <Plus className="h-4 w-4 mr-1" />Add
          </Button>
        </div>
        {referenceUrls.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {referenceUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{url}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onUrlsChange(referenceUrls.filter((_, idx) => idx !== i))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
