/**
 * DigestPanel — Sophisticated editable context digest with:
 * - Word count + section coverage indicators
 * - Side-by-side AI original vs curator version (Compare tab)
 * - Preview tab for read-only draft viewing
 * - Confirm to unlock Generate Suggestions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  RefreshCw, ChevronDown, BookOpen, Save, CheckCircle2,
  Pencil, RotateCcw, Eye, SplitSquareHorizontal, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DigestData {
  digest_text: string | null;
  source_count: number;
  key_facts?: unknown;
  curator_edited?: boolean;
  original_digest_text?: string | null;
}

interface DigestPanelProps {
  digest: DigestData | null | undefined;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onSave: (text: string) => void;
  isSaving: boolean;
  onConfirm: () => void;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const DIGEST_SECTIONS = [
  'Organization Context', 'Industry Landscape', 'Regulatory Environment',
  'Technology Context', 'Competitive Intelligence', 'Key Numbers', 'Risks',
];

function sectionCoverage(text: string): { present: string[]; missing: string[] } {
  const lower = text.toLowerCase();
  const present = DIGEST_SECTIONS.filter(s => lower.includes(s.toLowerCase()));
  const missing = DIGEST_SECTIONS.filter(s => !lower.includes(s.toLowerCase()));
  return { present, missing };
}

export function DigestPanel({
  digest, onRegenerate, isRegenerating, onSave, isSaving, onConfirm,
}: DigestPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [view, setView] = useState<'edit' | 'preview' | 'compare'>('edit');

  useEffect(() => {
    setDraft(digest?.digest_text ?? '');
    setConfirmed(false);
  }, [digest?.digest_text]);

  const isDirty = draft !== (digest?.digest_text ?? '');
  const hasDigest = !!digest?.digest_text;
  const wc = useMemo(() => wordCount(draft), [draft]);
  const coverage = useMemo(() => sectionCoverage(draft), [draft]);
  const hasOriginal = !!digest?.curator_edited && !!digest.original_digest_text;

  const handleSave = useCallback(() => {
    if (!isDirty) { setIsEditing(false); return; }
    onSave(draft);
    setIsEditing(false);
  }, [draft, isDirty, onSave]);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    onConfirm();
  }, [onConfirm]);

  return (
    <div className="border rounded-lg bg-card">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Context Digest</span>
            {digest?.source_count != null && (
              <Badge variant="secondary" className="text-[10px] h-5">{digest.source_count} sources</Badge>
            )}
            {digest?.curator_edited && (
              <Badge variant="outline" className="text-[10px] h-5 text-amber-600 border-amber-300">Curator edited</Badge>
            )}
            {confirmed && (
              <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 border-emerald-300">Confirmed</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {!isEditing && hasDigest && (
              <Button size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => { setIsEditing(true); setView('edit'); }}>
                <Pencil className="h-3 w-3 mr-1" />Edit
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => { onRegenerate(); setConfirmed(false); }}
              disabled={isRegenerating}>
              <RefreshCw className={cn('h-3 w-3 mr-1', isRegenerating && 'animate-spin')} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          {!hasDigest ? (
            <EmptyState onRegenerate={onRegenerate} isRegenerating={isRegenerating} />
          ) : isEditing ? (
            <EditMode
              draft={draft} setDraft={setDraft} view={view} setView={setView}
              wc={wc} coverage={coverage} hasOriginal={hasOriginal}
              originalText={digest?.original_digest_text ?? ''}
              onSave={handleSave}
              onCancel={() => { setDraft(digest?.digest_text ?? ''); setIsEditing(false); }}
              isSaving={isSaving} isDirty={isDirty}
            />
          ) : (
            <ReadMode digest={digest!} confirmed={confirmed} onConfirm={handleConfirm} />
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function EmptyState({ onRegenerate, isRegenerating }: { onRegenerate: () => void; isRegenerating: boolean }) {
  return (
    <div className="px-3 pb-4 pt-2 flex flex-col items-center justify-center gap-2 text-center min-h-[120px]">
      <BookOpen className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">No digest yet. Accept sources above and click Regenerate.</p>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onRegenerate} disabled={isRegenerating}>
        <RefreshCw className="h-3 w-3 mr-1" />Generate Digest
      </Button>
    </div>
  );
}

interface EditModeProps {
  draft: string; setDraft: (v: string) => void;
  view: 'edit' | 'preview' | 'compare'; setView: (v: 'edit' | 'preview' | 'compare') => void;
  wc: number; coverage: { missing: string[] }; hasOriginal: boolean; originalText: string;
  onSave: () => void; onCancel: () => void; isSaving: boolean; isDirty: boolean;
}

function EditMode({ draft, setDraft, view, setView, wc, coverage, hasOriginal, originalText, onSave, onCancel, isSaving, isDirty }: EditModeProps) {
  return (
    <div className="px-3 pb-3 space-y-2">
      <Tabs value={view} onValueChange={v => setView(v as 'edit' | 'preview' | 'compare')}>
        <div className="flex items-center justify-between">
          <TabsList className="h-7">
            <TabsTrigger value="edit" className="text-[11px] h-6 px-2"><Pencil className="h-3 w-3 mr-1" />Edit</TabsTrigger>
            <TabsTrigger value="preview" className="text-[11px] h-6 px-2"><Eye className="h-3 w-3 mr-1" />Preview</TabsTrigger>
            {hasOriginal && (
              <TabsTrigger value="compare" className="text-[11px] h-6 px-2">
                <SplitSquareHorizontal className="h-3 w-3 mr-1" />Compare
              </TabsTrigger>
            )}
          </TabsList>
          <span className={cn('text-[10px] font-medium', wc < 400 || wc > 800 ? 'text-amber-600' : 'text-emerald-600')}>
            {wc} words {wc < 400 ? '(too short)' : wc > 800 ? '(too long)' : '(good)'}
          </span>
        </div>

        <TabsContent value="edit" className="mt-2 space-y-1.5">
          <Textarea value={draft} onChange={e => setDraft(e.target.value)} rows={12}
            className="text-xs resize-none w-full leading-relaxed" placeholder="Digest text..." autoFocus />
          {coverage.missing.length > 0 && (
            <div className="flex items-start gap-1.5 text-[10px] text-amber-600">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>Missing sections: {coverage.missing.join(' · ')}</span>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="mt-2">
          <div className="max-h-[280px] overflow-y-auto rounded-md border p-3 text-xs leading-relaxed whitespace-pre-wrap bg-muted/20">
            {draft || <span className="text-muted-foreground italic">Nothing to preview</span>}
          </div>
        </TabsContent>

        {hasOriginal && (
          <TabsContent value="compare" className="mt-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">AI Original</p>
                <div className="max-h-[260px] overflow-y-auto rounded-md border p-2 text-[10px] leading-relaxed whitespace-pre-wrap bg-muted/10">
                  {originalText}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-primary mb-1">Your Version</p>
                <div className="max-h-[260px] overflow-y-auto rounded-md border border-primary/30 p-2 text-[10px] leading-relaxed whitespace-pre-wrap bg-primary/5">
                  {draft}
                </div>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="flex items-center justify-between gap-2 pt-1 border-t">
        <div>
          {hasOriginal && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
              onClick={() => setDraft(originalText)}>
              <RotateCcw className="h-3 w-3 mr-1" />Restore AI original
            </Button>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={isSaving || !isDirty}>
            <Save className="h-3 w-3 mr-1" />{isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReadMode({ digest, confirmed, onConfirm }: { digest: DigestData; confirmed: boolean; onConfirm: () => void }) {
  const keyFacts = digest.key_facts as Record<string, unknown> | null | undefined;
  const hasKeyFacts = keyFacts && typeof keyFacts === 'object' && Object.keys(keyFacts).length > 0;

  return (
    <div className="px-3 pb-3 space-y-2">
      <div className="max-h-[200px] overflow-y-auto rounded-md bg-muted/30 p-2.5 text-xs leading-relaxed whitespace-pre-wrap">
        {digest.digest_text}
      </div>

      {hasKeyFacts && (
        <div className="rounded-md border bg-primary/5 p-2 space-y-1">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Verified Key Facts</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
            {Object.entries(keyFacts)
              .filter(([, v]) => v && (Array.isArray(v) ? v.length > 0 : true))
              .map(([k, v]) => (
                <div key={k} className="text-[10px]">
                  <span className="font-medium text-muted-foreground capitalize">{k.replace(/_/g, ' ')}: </span>
                  <span className="text-foreground">{Array.isArray(v) ? v.slice(0, 2).join(', ') : String(v)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1.5 border-t">
        <p className="text-[11px] text-muted-foreground leading-tight">
          {confirmed
            ? '✅ Digest confirmed — Generate Suggestions is enabled.'
            : 'Review the digest above, edit if needed, then confirm to unlock suggestions.'}
        </p>
        <Button size="sm" variant={confirmed ? 'outline' : 'default'}
          className={cn('h-7 text-xs shrink-0', confirmed && 'text-emerald-600 border-emerald-300')}
          onClick={onConfirm} disabled={confirmed}>
          <CheckCircle2 className="h-3 w-3 mr-1" />{confirmed ? 'Confirmed' : 'Confirm & Close'}
        </Button>
      </div>
    </div>
  );
}
