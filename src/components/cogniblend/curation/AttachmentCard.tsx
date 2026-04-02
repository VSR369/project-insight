/**
 * AttachmentCard — Individual attachment display with extraction status,
 * sharing toggle, and metadata editing. Extracted from SectionReferencePanel.
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  FileText, Globe, Trash2, Loader2,
  CheckCircle2, XCircle, Eye, EyeOff, AlertCircle,
} from 'lucide-react';

export interface AttachmentRow {
  id: string;
  section_key: string;
  source_type: string;
  source_url: string | null;
  url_title: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  extracted_text: string | null;
  extraction_status: string | null;
  extraction_error: string | null;
  shared_with_solver: boolean;
  display_name: string | null;
  description: string | null;
  display_order: number | null;
}

interface AttachmentCardProps {
  att: AttachmentRow;
  sectionKey: string;
  disabled: boolean;
  sharingGuidance?: string;
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  onRemove: (att: AttachmentRow) => void;
  onRetry: (id: string) => void;
}

export function AttachmentCard({ att, sectionKey, disabled, sharingGuidance, onUpdate, onRemove, onRetry }: AttachmentCardProps) {
  const isUrl = att.source_type === 'url';
  const name = isUrl ? (att.url_title || att.source_url || 'Web link') : (att.file_name || 'File');
  const Icon = isUrl ? Globe : FileText;

  const statusIcon = att.extraction_status === 'completed'
    ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
    : att.extraction_status === 'failed'
      ? <XCircle className="h-3 w-3 text-destructive" />
      : att.extraction_status === 'processing'
        ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        : <Loader2 className="h-3 w-3 text-muted-foreground" />;

  return (
    <div className="border rounded-md p-2.5 bg-card space-y-1.5 text-xs">
      {/* Header row */}
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{name}</p>
          {isUrl && att.source_url && (
            <p className="text-[10px] text-muted-foreground truncate">{att.source_url}</p>
          )}
          {!isUrl && att.file_size && (
            <p className="text-[10px] text-muted-foreground">{(att.file_size / 1024).toFixed(1)} KB</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {statusIcon}
          {att.extraction_status === 'failed' && (
            <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px]" onClick={() => onRetry(att.id)}>
              Retry
            </Button>
          )}
        </div>
      </div>

      {/* Extraction status text */}
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {att.extraction_status === 'completed' && <span className="text-emerald-600">✅ AI reads this</span>}
        {att.extraction_status === 'processing' && <span>⏳ Extracting…</span>}
        {att.extraction_status === 'pending' && <span>⏳ Queued for extraction</span>}
        {att.extraction_status === 'failed' && (
          <span className="text-destructive">❌ Extraction failed{att.extraction_error ? `: ${att.extraction_error}` : ''}</span>
        )}
      </div>

      {/* Sharing toggle */}
      <div className="flex items-center gap-2">
        {att.shared_with_solver ? (
          <Eye className="h-3 w-3 text-primary" />
        ) : (
          <EyeOff className="h-3 w-3 text-muted-foreground" />
        )}
        <span className="text-[10px]">Share with solvers</span>
        <Switch
          checked={att.shared_with_solver}
          onCheckedChange={(checked) => onUpdate(att.id, { shared_with_solver: checked })}
          disabled={disabled}
          className="scale-75 origin-left"
        />
      </div>

      {/* Sharing fields — visible when shared */}
      {att.shared_with_solver && (
        <div className="space-y-1.5 pl-5">
          <Input
            placeholder="Display name for solvers"
            value={att.display_name || ''}
            onChange={(e) => onUpdate(att.id, { display_name: e.target.value || null })}
            className="h-7 text-xs"
            disabled={disabled}
          />
          <Input
            placeholder="Brief description"
            value={att.description || ''}
            onChange={(e) => onUpdate(att.id, { description: e.target.value || null })}
            className="h-7 text-xs"
            disabled={disabled}
          />
          {sharingGuidance && (
            <p className="text-[10px] text-muted-foreground flex items-start gap-1">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              {sharingGuidance}
            </p>
          )}
        </div>
      )}

      {/* Not shared notice */}
      {!att.shared_with_solver && (
        <p className="text-[10px] text-muted-foreground pl-5">
          AI uses this to inform review. Solvers will not see this.
        </p>
      )}

      {/* Remove */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1 text-[10px] text-destructive hover:text-destructive"
          onClick={() => onRemove(att)}
          disabled={disabled}
        >
          <Trash2 className="h-3 w-3 mr-0.5" />
          Remove
        </Button>
      </div>
    </div>
  );
}
