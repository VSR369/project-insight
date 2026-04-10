/**
 * CreatorAttachmentsSection — Displays creator-uploaded reference documents
 * and org profile attachments on the challenge detail view.
 * Queries challenge_attachments for section_key IN ('creator_reference', 'org_profile').
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, Paperclip } from 'lucide-react';
import { handleQueryError } from '@/lib/errorHandler';
import { CACHE_STANDARD } from '@/config/queryCache';

interface AttachmentRow {
  id: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  section_key: string;
  created_at: string | null;
}

interface CreatorAttachmentsSectionProps {
  challengeId: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeLabel(mime: string | null): string {
  if (!mime) return '';
  if (mime.includes('pdf')) return 'PDF';
  if (mime.includes('word') || mime.includes('docx')) return 'DOCX';
  if (mime.includes('spreadsheet') || mime.includes('xlsx')) return 'XLSX';
  if (mime.includes('csv')) return 'CSV';
  if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase() || 'Image';
  return mime.split('/').pop()?.toUpperCase() || '';
}

function sectionLabel(key: string): string {
  if (key === 'org_profile') return 'Org Profile';
  if (key === 'creator_reference') return 'Reference';
  return key;
}

export function CreatorAttachmentsSection({ challengeId }: CreatorAttachmentsSectionProps) {
  const { data: attachments = [], isLoading, error } = useQuery({
    queryKey: ['creator-detail-attachments', challengeId],
    enabled: !!challengeId,
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('challenge_attachments')
        .select('id, file_name, file_size, mime_type, storage_path, section_key, created_at')
        .eq('challenge_id', challengeId)
        .in('section_key', ['creator_reference', 'org_profile'])
        .eq('source_type', 'file')
        .order('created_at', { ascending: false });
      if (qErr) {
        handleQueryError(qErr, { operation: 'fetch_creator_detail_attachments' });
        throw qErr;
      }
      return (data ?? []) as AttachmentRow[];
    },
    ...CACHE_STANDARD,
  });

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading uploaded documents…
        </CardContent>
      </Card>
    );
  }

  if (error || attachments.length === 0) return null;

  const handleDownload = async (att: AttachmentRow) => {
    if (!att.storage_path) return;
    const { data, error: signErr } = await supabase.storage
      .from('challenge-attachments')
      .createSignedUrl(att.storage_path, 3600);
    if (signErr || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Paperclip className="h-3.5 w-3.5 text-primary" /> Uploaded Documents
          <Badge variant="secondary" className="text-[10px] ml-1">{attachments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-start gap-3 rounded-md border border-border p-3">
              <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.file_name || 'Untitled'}</p>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px]">{sectionLabel(att.section_key)}</Badge>
                  {att.mime_type && (
                    <Badge variant="secondary" className="text-[10px]">{getMimeLabel(att.mime_type)}</Badge>
                  )}
                  {att.file_size != null && att.file_size > 0 && (
                    <span className="text-xs text-muted-foreground">{formatFileSize(att.file_size)}</span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs h-7"
                onClick={() => handleDownload(att)}
                disabled={!att.storage_path}
              >
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
