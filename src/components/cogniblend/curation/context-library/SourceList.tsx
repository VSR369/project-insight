/**
 * SourceList — Left panel showing suggested + accepted sources grouped by section.
 */

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';
import { SuggestionCard } from './SuggestionCard';
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
  onAcceptMultiple, onRejectAll, onAcceptOne, onRejectOne,
  isAcceptPending, isRejectPending, isLoading,
}: SourceListProps) {
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

  const groupedAccepted = useMemo(() => {
    const groups: Record<string, ContextSource[]> = {};
    for (const s of filtered.accepted) {
      if (!groups[s.section_key]) groups[s.section_key] = [];
      groups[s.section_key].push(s);
    }
    return groups;
  }, [filtered.accepted]);

  const handleAcceptAll = () => {
    const ids = filtered.suggested.map(s => s.id);
    if (ids.length > 0) onAcceptMultiple(ids);
  };

  return (
    <ScrollArea className="w-[40%] border-r">
      <div className="p-3 space-y-4">
        {/* Suggested sources */}
        {filtered.suggested.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-primary">AI Suggested ({filtered.suggested.length})</h4>
            </div>
            <div className="space-y-1">
              {filtered.suggested.map(s => (
                <SuggestionCard
                  key={s.id}
                  source={s}
                  isActive={selectedId === s.id}
                  onSelect={() => onSelectSource(s.id)}
                  onAccept={onAcceptOne}
                  onReject={onRejectOne}
                  isAcceptPending={isAcceptPending}
                  isRejectPending={isRejectPending}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                size="sm" variant="default" className="text-xs h-7"
                onClick={handleAcceptAll}
                disabled={filtered.suggested.length === 0 || isAcceptPending}
              >
                Accept All ({filtered.suggested.length})
              </Button>
              <Button
                size="sm" variant="outline" className="text-xs h-7"
                onClick={onRejectAll} disabled={isRejectPending}
              >
                Reject All
              </Button>
            </div>
            <Separator className="mt-3" />
          </div>
        )}

        {/* Accepted sources grouped by section */}
        {Object.entries(groupedAccepted).map(([sectionKey, items]) => (
          <div key={sectionKey}>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1">
              {SECTION_LABELS[sectionKey] || sectionKey} ({items.length})
            </h4>
            <div className="space-y-1">
              {items.map(s => (
                <div
                  key={s.id}
                  className={`p-2 rounded-md cursor-pointer hover:bg-muted/50 text-sm flex items-start gap-2 ${selectedId === s.id ? 'bg-muted' : ''}`}
                  onClick={() => onSelectSource(s.id)}
                >
                  {s.source_type === 'url' ? (
                    <Globe className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{displayName(s)}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <ExtractionBadge status={s.extraction_status} />
                      {s.resource_type && <Badge variant="outline" className="text-[10px] h-4">{s.resource_type}</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.accepted.length === 0 && filtered.suggested.length === 0 && !isLoading && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No sources yet. Click "Discover Sources" to find relevant context.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
