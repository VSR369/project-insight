/**
 * ContextLibraryDrawer — Thin orchestrator importing sub-components.
 * Decomposed per plan Gap 6: < 120 lines.
 */

import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Link, Sparkles, BookOpen, X } from 'lucide-react';
import {
  useContextSources, useContextDigest, useDiscoverSources,
  useAcceptSuggestion, useRejectSuggestion, useAcceptMultipleSuggestions,
  useRejectAllSuggestions, useAddContextUrl, useDeleteContextSource,
  useUpdateSourceSharing, useUpdateSourceSections, useRegenerateDigest,
} from '@/hooks/cogniblend/useContextLibrary';
import { SourceList } from './context-library/SourceList';
import { SourceDetail } from './context-library/SourceDetail';
import { DigestPanel } from './context-library/DigestPanel';
import { SECTION_LABELS } from './context-library/types';

interface ContextLibraryDrawerProps {
  challengeId: string;
  challengeTitle?: string;
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function ContextLibraryDrawer({ challengeId, challengeTitle, open, onClose, onOpenChange }: ContextLibraryDrawerProps) {
  const handleClose = () => { onClose?.(); onOpenChange?.(false); };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlSection, setUrlSection] = useState('problem_statement');

  const { data: sources = [], isLoading } = useContextSources(challengeId);
  const { data: digest } = useContextDigest(challengeId);
  const discover = useDiscoverSources(challengeId);
  const acceptOne = useAcceptSuggestion(challengeId);
  const rejectOne = useRejectSuggestion(challengeId);
  const acceptMultiple = useAcceptMultipleSuggestions(challengeId);
  const rejectAll = useRejectAllSuggestions(challengeId);
  const addUrl = useAddContextUrl(challengeId);
  const deleteSource = useDeleteContextSource(challengeId);
  const updateSharing = useUpdateSourceSharing(challengeId);
  const updateSection = useUpdateSourceSections(challengeId);
  const regenDigest = useRegenerateDigest(challengeId);

  const selectedSource = useMemo(() => sources.find(s => s.id === selectedId) || null, [sources, selectedId]);

  const handleAddUrl = () => {
    if (!urlValue.trim()) return;
    addUrl.mutate({ url: urlValue.trim(), sectionKey: urlSection });
    setUrlValue('');
    setShowUrlInput(false);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="!w-[900px] !max-w-[900px] !p-0 flex flex-col overflow-hidden">
        <SheetHeader className="shrink-0 p-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />Context Library
            </SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground truncate">{challengeTitle}</p>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Button size="sm" variant="default" onClick={() => discover.mutate()} disabled={discover.isPending}>
              <Sparkles className="h-4 w-4 mr-1" />{discover.isPending ? 'Discovering...' : 'Discover Sources'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowUrlInput(!showUrlInput)}>
              <Link className="h-4 w-4 mr-1" />Add URL
            </Button>
            <div className="flex-1" />
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search sources..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
            </div>
          </div>
          {showUrlInput && (
            <div className="flex items-center gap-2 mt-2">
              <Input placeholder="https://..." value={urlValue} onChange={e => setUrlValue(e.target.value)} className="h-8 text-sm flex-1" onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); }} />
              <Select value={urlSection} onValueChange={setUrlSection}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (<SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddUrl} disabled={!urlValue.trim() || addUrl.isPending}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUrlInput(false)}><X className="h-4 w-4" /></Button>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 flex min-h-0">
          <SourceList
            sources={sources} searchTerm={searchTerm} selectedId={selectedId}
            onSelectSource={setSelectedId}
            onAcceptMultiple={(ids) => acceptMultiple.mutate(ids)}
            onRejectAll={() => rejectAll.mutate()}
            isAcceptPending={acceptMultiple.isPending} isRejectPending={rejectAll.isPending}
            isLoading={isLoading}
          />
          <div className="flex-1 flex flex-col min-h-0">
            {selectedSource ? (
              <SourceDetail
                source={selectedSource}
                onAccept={(id) => acceptOne.mutate(id)}
                onReject={(id) => rejectOne.mutate(id)}
                onDelete={(s) => { deleteSource.mutate(s); setSelectedId(null); }}
                onUpdateSection={(id, sk) => updateSection.mutate({ id, sectionKey: sk })}
                onUpdateSharing={(id, v) => updateSharing.mutate({ id, shared: v })}
                isAcceptPending={acceptOne.isPending} isRejectPending={rejectOne.isPending}
                isDeletePending={deleteSource.isPending}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Select a source to view details</div>
            )}
            <DigestPanel digest={digest} onRegenerate={() => regenDigest.mutate()} isRegenerating={regenDigest.isPending} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
