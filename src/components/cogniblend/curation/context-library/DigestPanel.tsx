/**
 * DigestPanel — Right column: generate digest, edit, save, confirm & close.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { normalizeAiContentForEditor } from '@/lib/aiContentFormatter';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw, BookOpen, Save, CheckCircle2,
  Pencil, RotateCcw, Eye, SplitSquareHorizontal, AlertTriangle, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DigestData {
  digest_text: string | null;
  source_count: number;
  key_facts?: unknown;
  curator_edited?: boolean;
  original_digest_text?: string | null;
}

interface DigestPanelProps {
  digest: DigestData | null | undefined;
  acceptedCount: number;
  extractedCount: number;
  emptyExtractionCount: number;
  onGenerate: () => void;
  isGenerating: boolean;
  onSave: (text: string) => void;
  isSaving: boolean;
  onConfirm: () => void;
}

function wordCount(text: string): number {
  return text.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

export function DigestPanel({
  digest, acceptedCount, extractedCount, emptyExtractionCount,
  onGenerate, isGenerating, onSave, isSaving, onConfirm,
}: DigestPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    setDraft(normalizeAiContentForEditor(digest?.digest_text ?? ''));
    setConfirmed(false);
  }, [digest?.digest_text]);

  const isDirty = draft !== (digest?.digest_text ?? '');
  const hasDigest = !!digest?.digest_text;
  const wc = useMemo(() => wordCount(draft), [draft]);
  const hasOriginal = !!digest?.curator_edited && !!digest.original_digest_text;

  const handleSave = useCallback(() => {
    if (!isDirty) { setIsEditing(false); return; }
    onSave(draft);
    setIsEditing(false);
  }, [draft, isDirty, onSave]);

  const handleConfirm = useCallback(() => { setConfirmed(true); onConfirm(); }, [onConfirm]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Context Digest</span>
          {digest?.source_count != null && (
            <Badge variant="secondary" className="text-[10px] h-5">{digest.source_count} sources</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!isEditing && hasDigest && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setIsEditing(true); setView('edit'); }}>
              <Pencil className="h-3 w-3 mr-1" />Edit
            </Button>
          )}
          {hasDigest && (
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { onGenerate(); setConfirmed(false); }} disabled={isGenerating}>
              <RefreshCw className={cn('h-3 w-3 mr-1', isGenerating && 'animate-spin')} />Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {!hasDigest ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center py-12">
              <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              {acceptedCount > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {extractedCount} extracted source{extractedCount !== 1 ? 's' : ''} ready.
                  </p>
                  {emptyExtractionCount > 0 && (
                    <p className="text-[10px] text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {emptyExtractionCount} source{emptyExtractionCount !== 1 ? 's' : ''} skipped (empty extraction)
                    </p>
                  )}
                  <Button size="sm" onClick={onGenerate} disabled={isGenerating}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    {isGenerating ? 'Generating...' : `Generate Context from ${extractedCount} sources`}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Accept sources first, then generate digest.</p>
              )}
            </div>
          ) : isEditing ? (
            <div className="space-y-2">
              <Tabs value={view} onValueChange={v => setView(v as 'edit' | 'preview')}>
                <div className="flex items-center justify-between">
                  <TabsList className="h-7">
                    <TabsTrigger value="edit" className="text-[11px] h-6 px-2"><Pencil className="h-3 w-3 mr-1" />Edit</TabsTrigger>
                    <TabsTrigger value="preview" className="text-[11px] h-6 px-2"><Eye className="h-3 w-3 mr-1" />Preview</TabsTrigger>
                  </TabsList>
                  <span className={cn('text-[10px] font-medium', wc < 400 || wc > 800 ? 'text-amber-600' : 'text-emerald-600')}>
                    {wc} words
                  </span>
                </div>
                <TabsContent value="edit" className="mt-2">
                  <RichTextEditor value={draft} onChange={setDraft} className="min-h-[400px]" storagePath="context-digest-media" />
                </TabsContent>
                <TabsContent value="preview" className="mt-2">
                  <div className="rounded-md border p-3 bg-muted/20">
                    <SafeHtmlRenderer html={draft} fallback="Nothing to preview" />
                  </div>
                </TabsContent>
              </Tabs>
              {hasOriginal && (
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => setDraft(digest?.original_digest_text ?? '')}>
                  <RotateCcw className="h-3 w-3 mr-1" />Restore AI original
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/30 p-3 max-h-[500px] overflow-y-auto prose prose-sm">
                <SafeHtmlRenderer html={normalizeAiContentForEditor(digest!.digest_text)} />
              </div>
              {digest?.curator_edited && (
                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Curator edited</Badge>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t p-3 flex items-center justify-between gap-2 bg-background">
        {isEditing ? (
          <>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setDraft(digest?.digest_text ?? ''); setIsEditing(false); }}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={isSaving || !isDirty}>
              <Save className="h-3 w-3 mr-1" />{isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground leading-tight flex-1">
              {confirmed ? '✅ Digest confirmed.' : 'Review digest, then confirm to proceed.'}
            </p>
            <Button size="sm" variant={confirmed ? 'outline' : 'default'}
              className={cn('h-8 text-xs shrink-0', confirmed && 'text-emerald-600 border-emerald-300')}
              onClick={handleConfirm} disabled={confirmed || !hasDigest}>
              <CheckCircle2 className="h-3 w-3 mr-1" />{confirmed ? 'Confirmed' : 'Confirm & Close'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
