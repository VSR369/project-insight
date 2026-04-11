/**
 * DigestPanel — Editable context digest with Save + Confirm flow.
 * Curator can edit AI-generated text before it feeds into Pass 2 suggestions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, ChevronDown, BookOpen, Save, CheckCircle2, Pencil, RotateCcw } from 'lucide-react';
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

export function DigestPanel({
  digest,
  onRegenerate,
  isRegenerating,
  onSave,
  isSaving,
  onConfirm,
}: DigestPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setDraft(digest?.digest_text ?? '');
    setConfirmed(false);
  }, [digest?.digest_text]);

  const isDirty = draft !== (digest?.digest_text ?? '');
  const hasDigest = !!digest?.digest_text;

  const handleSave = useCallback(() => {
    if (!isDirty) { setIsEditing(false); return; }
    onSave(draft);
    setIsEditing(false);
  }, [draft, isDirty, onSave]);

  const handleRestoreOriginal = useCallback(() => {
    if (digest?.original_digest_text) {
      setDraft(digest.original_digest_text);
    }
  }, [digest?.original_digest_text]);

  const handleConfirm = useCallback(() => {
    setConfirmed(true);
    onConfirm();
  }, [onConfirm]);

  return (
    <div className="shrink-0 border-t">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
          <span className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Context Digest
            {digest?.source_count != null && (
              <Badge variant="secondary" className="text-xs">{digest.source_count} sources</Badge>
            )}
            {digest?.curator_edited && (
              <Badge variant="outline" className="text-xs">Edited</Badge>
            )}
            {confirmed && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300">
                Confirmed
              </Badge>
            )}
          </span>
          <div className="flex items-center gap-2">
            {!isEditing && hasDigest && (
              <Button
                size="sm" variant="ghost" className="h-6 text-xs"
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              >
                <Pencil className="h-3 w-3 mr-1" />Edit
              </Button>
            )}
            <Button
              size="sm" variant="ghost" className="h-6 text-xs"
              onClick={(e) => { e.stopPropagation(); onRegenerate(); setConfirmed(false); }}
              disabled={isRegenerating}
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isRegenerating && 'animate-spin')} />
              {isRegenerating ? 'Generating...' : 'Regenerate'}
            </Button>
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {!hasDigest ? (
              <p className="text-xs text-muted-foreground">
                No digest generated yet. Accept sources above and click "Regenerate".
              </p>
            ) : isEditing ? (
              <EditMode
                draft={draft}
                onDraftChange={setDraft}
                onSave={handleSave}
                onCancel={() => { setDraft(digest?.digest_text ?? ''); setIsEditing(false); }}
                onRestore={handleRestoreOriginal}
                canRestore={!!digest?.curator_edited && !!digest.original_digest_text}
                isSaving={isSaving}
                isDirty={isDirty}
              />
            ) : (
              <ReadMode
                digest={digest}
                confirmed={confirmed}
                onConfirm={handleConfirm}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* ── Sub-components to keep main component concise ── */

interface EditModeProps {
  draft: string;
  onDraftChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onRestore: () => void;
  canRestore: boolean;
  isSaving: boolean;
  isDirty: boolean;
}

function EditMode({ draft, onDraftChange, onSave, onCancel, onRestore, canRestore, isSaving, isDirty }: EditModeProps) {
  return (
    <>
      <p className="text-[11px] text-muted-foreground">
        Edit the digest text to focus AI suggestions on what matters most for this challenge.
      </p>
      <Textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        rows={10}
        className="text-xs font-mono resize-none w-full"
        placeholder="Digest text..."
        autoFocus
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {canRestore && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onRestore}>
              <RotateCcw className="h-3 w-3 mr-1" />Restore AI original
            </Button>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={onSave} disabled={isSaving || !isDirty}>
            <Save className="h-3 w-3 mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </>
  );
}

interface ReadModeProps {
  digest: DigestData;
  confirmed: boolean;
  onConfirm: () => void;
}

function ReadMode({ digest, confirmed, onConfirm }: ReadModeProps) {
  const keyFacts = digest.key_facts as Record<string, unknown> | null | undefined;
  const hasKeyFacts = keyFacts && Object.keys(keyFacts).length > 0;

  return (
    <>
      <div className="max-h-[180px] overflow-y-auto rounded-md bg-muted/30 p-2.5">
        <p className="text-xs whitespace-pre-wrap text-foreground leading-relaxed">
          {digest.digest_text}
        </p>
      </div>

      {hasKeyFacts && (
        <div className="rounded-md border bg-muted/20 p-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Verified Key Facts
          </p>
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-auto max-h-[80px]">
            {JSON.stringify(keyFacts, null, 2)}
          </pre>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t">
        <p className="text-[11px] text-muted-foreground">
          {confirmed
            ? 'Digest confirmed — Generate Suggestions is now enabled.'
            : 'Review the digest, then confirm to enable suggestions.'}
        </p>
        <Button
          size="sm"
          variant={confirmed ? 'outline' : 'default'}
          className={cn(
            'h-7 text-xs shrink-0',
            confirmed && 'text-emerald-600 border-emerald-300',
          )}
          onClick={onConfirm}
          disabled={confirmed}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {confirmed ? 'Confirmed' : 'Confirm Digest'}
        </Button>
      </div>
    </>
  );
}
