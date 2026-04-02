/**
 * SectionReferencePanel — Collapsible per-section panel for reference materials (files + URLs).
 * Supports upload, URL add, extraction status, sharing toggle, and display metadata.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SECTION_UPLOAD_CONFIG, SHARING_GUIDANCE } from '@/lib/cogniblend/sectionUploadConfig';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Paperclip, Upload, Link2, Loader2, ChevronDown, BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AttachmentCard, type AttachmentRow } from './AttachmentCard';

interface SectionReferencePanelProps {
  challengeId: string;
  sectionKey: string;
  disabled?: boolean;
  onOpenLibrary?: (sectionKey: string) => void;
}

export function SectionReferencePanel({ challengeId, sectionKey, disabled = false, onOpenLibrary }: SectionReferencePanelProps) {
  const config = SECTION_UPLOAD_CONFIG[sectionKey];

  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const queryKey = ['challenge-attachments', challengeId, sectionKey];

  const { data: attachments = [] } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_attachments')
        .select('id, section_key, source_type, source_url, url_title, file_name, file_size, mime_type, storage_path, extracted_text, extraction_status, extraction_error, shared_with_solver, display_name, description, display_order')
        .eq('challenge_id', challengeId)
        .eq('section_key', sectionKey)
        .order('display_order');
      if (error) throw new Error(error.message);
      return (data || []) as AttachmentRow[];
    },
    staleTime: 30_000,
    enabled: !!config?.enabled,
  });

  const triggerExtraction = useCallback(async (attachmentId: string) => {
    try {
      await supabase.functions.invoke('extract-attachment-text', { body: { attachment_id: attachmentId } });
    } catch { /* extraction is best-effort */ }
    setTimeout(() => queryClient.invalidateQueries({ queryKey }), 3000);
    setTimeout(() => queryClient.invalidateQueries({ queryKey }), 8000);
  }, [queryClient, queryKey]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!config?.enabled) return;
    const fileCount = attachments.filter(a => a.source_type === 'file').length;
    if (fileCount >= config.maxFiles) { toast.error('Maximum files reached for this section'); return; }
    if (!config.acceptedFormats.includes(file.type)) { toast.error('Unsupported file format'); return; }
    if (file.size > config.maxFileSizeMB * 1024 * 1024) { toast.error(`File exceeds ${config.maxFileSizeMB} MB limit`); return; }

    setUploading(true);
    try {
      const safeName = sanitizeFileName(file.name);
      const storagePath = `${challengeId}/${sectionKey}/${crypto.randomUUID()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from('challenge-attachments').upload(storagePath, file);
      if (uploadErr) throw uploadErr;

      const { data: row, error: insertErr } = await supabase
        .from('challenge_attachments')
        .insert({
          challenge_id: challengeId,
          section_key: sectionKey,
          source_type: 'file',
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: storagePath,
          extraction_status: 'pending',
          shared_with_solver: config.sharingDefault,
        })
        .select('id')
        .single();
      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey });
      toast.success('File uploaded');
      if (row?.id) triggerExtraction(row.id);
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }, [attachments, config, challengeId, sectionKey, queryClient, queryKey, triggerExtraction]);

  const handleAddUrl = useCallback(async () => {
    if (!config?.enabled) return;
    const urlCt = attachments.filter(a => a.source_type === 'url').length;
    if (urlCt >= config.maxUrls) { toast.error('Maximum URLs reached for this section'); return; }
    const trimmedUrl = urlValue.trim();
    if (!trimmedUrl) { toast.error('Please enter a URL'); return; }
    try { new URL(trimmedUrl); } catch { toast.error('Invalid URL format'); return; }

    try {
      const { data: row, error } = await supabase
        .from('challenge_attachments')
        .insert({
          challenge_id: challengeId,
          section_key: sectionKey,
          source_type: 'url',
          source_url: trimmedUrl,
          url_title: urlTitle.trim() || null,
          extraction_status: 'pending',
          shared_with_solver: config.sharingDefault,
        })
        .select('id')
        .single();
      if (error) throw error;

      setUrlValue('');
      setUrlTitle('');
      setShowUrlInput(false);
      queryClient.invalidateQueries({ queryKey });
      toast.success('Web link added');
      if (row?.id) triggerExtraction(row.id);
    } catch (err: any) {
      toast.error(`Failed to add link: ${err.message}`);
    }
  }, [attachments, urlValue, urlTitle, challengeId, sectionKey, config, queryClient, queryKey, triggerExtraction]);

  const updateAttachment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('challenge_attachments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeAttachment = useMutation({
    mutationFn: async (att: AttachmentRow) => {
      if (att.source_type === 'file' && att.storage_path) {
        await supabase.storage.from('challenge-attachments').remove([att.storage_path]);
      }
      const { error } = await supabase.from('challenge_attachments').delete().eq('id', att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Reference removed');
    },
    onError: (err: Error) => toast.error(`Remove failed: ${err.message}`),
  });

  const retryExtraction = useCallback(async (id: string) => {
    await supabase.from('challenge_attachments').update({ extraction_status: 'pending', extraction_error: null }).eq('id', id);
    triggerExtraction(id);
    toast.info('Retrying extraction…');
  }, [triggerExtraction]);

  // ── All hooks above, conditional return below ──
  if (!config?.enabled) return null;

  const fileCount = attachments.filter(a => a.source_type === 'file').length;
  const urlCount = attachments.filter(a => a.source_type === 'url').length;
  const canAddFile = fileCount < config.maxFiles;
  const canAddUrl = urlCount < config.maxUrls;
  const sharingGuidance = SHARING_GUIDANCE[sectionKey];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md w-full text-left transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            isOpen && 'bg-muted/50 text-foreground',
          )}
        >
          <Paperclip className="h-3.5 w-3.5" />
          <span>Reference Materials</span>
          {attachments.length > 0 && (
            <span className="bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
          <ChevronDown className={cn('h-3 w-3 ml-auto transition-transform', isOpen && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 space-y-2">
        {attachments.map((att) => (
          <AttachmentCard
            key={att.id}
            att={att}
            sectionKey={sectionKey}
            disabled={disabled}
            sharingGuidance={sharingGuidance}
            onUpdate={(id, updates) => updateAttachment.mutate({ id, updates })}
            onRemove={(a) => removeAttachment.mutate(a)}
            onRetry={(id) => retryExtraction(id)}
          />
        ))}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || uploading || !canAddFile}
            onClick={() => fileInputRef.current?.click()}
            className="text-xs h-7"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
            Upload File
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || !canAddUrl}
            onClick={() => setShowUrlInput(true)}
            className="text-xs h-7"
          >
            <Link2 className="h-3 w-3 mr-1" />
            Add Web Link
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={config.acceptedFormats.join(',')}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>

        {showUrlInput && (
          <div className="border rounded-md p-2 space-y-2 bg-muted/30">
            <Input placeholder="https://..." value={urlValue} onChange={(e) => setUrlValue(e.target.value)} className="h-8 text-xs" />
            <Input placeholder="Title (optional)" value={urlTitle} onChange={(e) => setUrlTitle(e.target.value)} className="h-8 text-xs" />
            <div className="flex gap-2">
              <Button size="sm" className="text-xs h-7" onClick={handleAddUrl}>Add</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setShowUrlInput(false); setUrlValue(''); setUrlTitle(''); }}>Cancel</Button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground px-1">
          {config.uploadPrompt}. All materials are read by AI.
          {config.sharingRecommendation === 'recommended' && ' Sharing with solvers is recommended for this section.'}
        </p>

        {onOpenLibrary && (
          <button
            type="button"
            onClick={() => onOpenLibrary(sectionKey)}
            className="flex items-center gap-1 text-[10px] text-primary hover:underline px-1 mt-1"
          >
            <BookOpen className="h-3 w-3" />
            View all sources in Context Library
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
