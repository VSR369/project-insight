/**
 * SourceList — Left column showing suggested + accepted sources.
 * Sticky bottom bar for bulk accept/reject actions.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, FileText, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import { SuggestionCard } from './SuggestionCard';
import { ContentIndicators } from './ContentIndicators';
import { SECTION_LABELS, displayName, matchSource, type ContextSource } from './types';

interface SourceListProps {
  sources: ContextSource[];
  searchTerm: string;
  selectedId: string | null;
  onSelectSource: (id: string) => void;
  onAcceptMultiple: (ids: string[]) => void;
  onRejectAll: () => void;
  onAcceptOne: (id: string) => void;
  onRejectOne: (id: string) => void;
  onUnaccept: (id: string) => void;
  isAcceptPending: boolean;
  isRejectPending: boolean;
  isLoading: boolean;
}

function ExtractionBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-xs gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />Extracted</Badge>;
    case 'processing':
      return <Badge variant="outline" className="text-xs gap-1 text-amber-600"><Clock className="h-3 w-3 animate-spin" />Extracting...</Badge>;
    case 'failed':
      return <Badge variant="outline" className="text-xs gap-1 text-destructive"><XCircle className="h-3 w-3" />Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>;
  }
}

export function SourceList({
  sources, searchTerm, selectedId, onSelectSource,
  onAcceptMultiple, onRejectAll, onAcceptOne, onRejectOne, onUnaccept,
  isAcceptPending, isRejectPending, isLoading,
}: SourceListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const accepted = useMemo(() => sources.filter(s => s.discovery_status === 'accepted'), [sources]);
  const suggested = useMemo(() => sources.filter(s => s.discovery_status === 'suggested'), [sources]);

  const filtered = useMemo(() => {
    if (!searchTerm) return { accepted, suggested };
    const term = searchTerm.toLowerCase();
    return {
      accepted: accepted.filter(s => matchSource(s, term)),
      suggested: suggested.filter(s => matchSource(s, term)),
    };
  }, [accepted, suggested, searchTerm]);

  const extractedCount = useMemo(() => filtered.accepted.filter(s => s.extraction_status === 'completed').length, [filtered.accepted]);
  const emptyCount = filtered.accepted.length - extractedCount;

  const groupedAccepted = useMemo(() => {
    const groups: Record<string, ContextSource[]> = {};
    for (const s of filtered.accepted) {
      if (!groups[s.section_key]) groups[s.section_key] = [];
      groups[s.section_key].push(s);
    }
    return groups;
  }, [filtered.accepted]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = filtered.suggested.map(s => s.id);
    setSelectedIds(allIds.every(id => selectedIds.has(id)) ? new Set() : new Set(allIds));
  }, [filtered.suggested, selectedIds]);

  const allSelected = filtered.suggested.length > 0 && filtered.suggested.every(s => selectedIds.has(s.id));

  const handleAcceptAction = useCallback(() => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : filtered.suggested.map(s => s.id);
    if (ids.length > 0) { onAcceptMultiple(ids); setSelectedIds(new Set()); }
  }, [selectedIds, filtered.suggested, onAcceptMultiple]);

  const handleAcceptOne = useCallback((id: string) => {
    onAcceptOne(id); setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, [onAcceptOne]);

  const handleRejectOne = useCallback((id: string) => {
    onRejectOne(id); setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  }, [onRejectOne]);

  const acceptLabel = selectedIds.size > 0
    ? `Accept Selected (${selectedIds.size})`
    : `Accept All (${filtered.suggested.length})`;

  return (
    <div className="w-[30%] border-r flex flex-col min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {filtered.suggested.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                <h4 className="text-sm font-semibold text-primary">AI Suggested ({filtered.suggested.length})</h4>
              </div>
              <div className="space-y-1">
                {filtered.suggested.map(s => (
                  <SuggestionCard key={s.id} source={s} isActive={selectedId === s.id}
                    isSelected={selectedIds.has(s.id)} onSelect={() => onSelectSource(s.id)}
                    onToggleSelect={handleToggleSelect} onAccept={handleAcceptOne}
                    onReject={handleRejectOne} isAcceptPending={isAcceptPending}
                    isRejectPending={isRejectPending} />
                ))}
              </div>
              <Separator className="mt-3" />
            </div>
          )}

          {filtered.accepted.length > 0 && (
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Accepted ({extractedCount} extracted · {emptyCount} empty)
            </h4>
          )}
          {Object.entries(groupedAccepted).map(([sectionKey, items]) => (
            <div key={sectionKey}>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                {SECTION_LABELS[sectionKey] || sectionKey} ({items.length})
              </h4>
              <div className="space-y-1">
                {items.map(s => (
                  <div key={s.id}
                    className={`p-2 rounded-md cursor-pointer hover:bg-muted/50 text-sm flex items-start gap-2 group ${selectedId === s.id ? 'bg-muted' : ''}`}
                    onClick={() => onSelectSource(s.id)}>
                    {s.source_type === 'url' ? <Globe className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" /> : <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{displayName(s)}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <ExtractionBadge status={s.extraction_status} />
                        <ContentIndicators source={s} />
                      </div>
                    </div>
                    <Button size="icon" variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={e => { e.stopPropagation(); onUnaccept(s.id); }} title="Move back to suggested">
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filtered.accepted.length === 0 && filtered.suggested.length === 0 && !isLoading && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No sources yet. Click &quot;Re-discover Sources&quot; to find relevant context.
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Sticky bottom bar */}
      {filtered.suggested.length > 0 && (
        <div className="shrink-0 border-t p-2 flex gap-2 bg-background">
          <Button size="sm" variant="outline" className="text-xs h-7 flex-1"
            onClick={() => { onRejectAll(); setSelectedIds(new Set()); }} disabled={isRejectPending}>
            Reject All Suggested
          </Button>
          <Button size="sm" variant="default" className="text-xs h-7 flex-1"
            onClick={handleAcceptAction} disabled={filtered.suggested.length === 0 || isAcceptPending}>
            {acceptLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
