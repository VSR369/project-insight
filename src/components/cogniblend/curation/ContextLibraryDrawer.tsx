/**
 * ContextLibraryDrawer — Thin orchestrator importing sub-components.
 * Bug 2 fix: Added file upload UI with dedicated panel.
 * Bug 7 fix: Passes acceptOne/rejectOne to SourceList.
 */

import React, { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Link, Sparkles, BookOpen, X, Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useContextSources, useContextDigest, useDiscoverSources,
  useAcceptSuggestion, useRejectSuggestion, useAcceptMultipleSuggestions,
  useRejectAllSuggestions, useAddContextUrl, useDeleteContextSource,
  useUpdateSourceSharing, useUpdateSourceSections, useRegenerateDigest,
  useSaveDigest, useUploadContextFile,
} from '@/hooks/cogniblend/useContextLibrary';
import { SourceList } from './context-library/SourceList';
import { SourceDetail } from './context-library/SourceDetail';
import { DigestPanel } from './context-library/DigestPanel';
import { SECTION_LABELS } from './context-library/types';

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '20MB';

interface ContextLibraryDrawerProps {
  challengeId: string;
  challengeTitle?: string;
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
}

type AddMode = 'url' | 'file' | null;

export function ContextLibraryDrawer({ challengeId, challengeTitle, open, onClose, onOpenChange }: ContextLibraryDrawerProps) {
  const handleClose = () => { onClose?.(); onOpenChange?.(false); };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [urlValue, setUrlValue] = useState('');
  const [urlSection, setUrlSection] = useState('problem_statement');
  const [fileSection, setFileSection] = useState('problem_statement');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sources = [], isLoading } = useContextSources(challengeId);
  const { data: digest } = useContextDigest(challengeId);
  const discover = useDiscoverSources(challengeId);
  const acceptOne = useAcceptSuggestion(challengeId);
  const rejectOne = useRejectSuggestion(challengeId);
  const acceptMultiple = useAcceptMultipleSuggestions(challengeId);
  const rejectAll = useRejectAllSuggestions(challengeId);
  const addUrl = useAddContextUrl(challengeId);
  const uploadFile = useUploadContextFile(challengeId);
  const deleteSource = useDeleteContextSource(challengeId);
  const updateSharing = useUpdateSourceSharing(challengeId);
  const updateSection = useUpdateSourceSections(challengeId);
  const regenDigest = useRegenerateDigest(challengeId);
  const saveDigest = useSaveDigest(challengeId);

  const selectedSource = useMemo(() => sources.find(s => s.id === selectedId) || null, [sources, selectedId]);

  const suggestedCount = useMemo(
    () => sources.filter(s => s.discovery_status === 'suggested').length,
    [sources]
  );

  const handleAddUrl = () => {
    if (!urlValue.trim()) return;
    try { new URL(urlValue.trim()); } catch {
      alert('Please enter a valid URL starting with https://');
      return;
    }
    addUrl.mutate({ url: urlValue.trim(), sectionKey: urlSection });
    setUrlValue('');
    setAddMode(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`File must be under ${MAX_FILE_SIZE_LABEL}`);
      return;
    }
    uploadFile.mutate({ file, sectionKey: fileSection });
    setAddMode(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="w-[calc(100vw-80px)] max-w-none h-[calc(100vh-80px)] flex flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 p-4 pb-3 border-b min-h-[4rem]">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" />
              Context Library
              {suggestedCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {suggestedCount} awaiting review
                </Badge>
              )}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground truncate">{challengeTitle}</p>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Button size="sm" variant="default" onClick={() => discover.mutate()} disabled={discover.isPending}>
              <Sparkles className="h-4 w-4 mr-1" />{discover.isPending ? 'Discovering...' : 'Re-discover Sources'}
            </Button>
            <Button size="sm" variant={addMode === 'url' ? 'secondary' : 'outline'} onClick={() => setAddMode(addMode === 'url' ? null : 'url')}>
              <Link className="h-4 w-4 mr-1" />Add URL
            </Button>
            <Button
              size="sm"
              variant={addMode === 'file' ? 'secondary' : 'outline'}
              onClick={() => setAddMode(addMode === 'file' ? null : 'file')}
              disabled={uploadFile.isPending}
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploadFile.isPending ? 'Uploading...' : 'Upload Document'}
            </Button>
            <div className="flex-1" />
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search sources..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
            </div>
          </div>

          {/* URL input row */}
          {addMode === 'url' && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="https://..."
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                className="h-8 text-sm flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleAddUrl(); }}
                autoFocus
              />
              <Select value={urlSection} onValueChange={setUrlSection}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (<SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAddUrl} disabled={!urlValue.trim() || addUrl.isPending}>
                {addUrl.isPending ? 'Adding...' : 'Add'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAddMode(null)}><X className="h-4 w-4" /></Button>
            </div>
          )}

          {/* File upload row */}
          {addMode === 'file' && (
            <div className="flex items-center gap-2 mt-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadFile.isPending}>
                  Choose File
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOCX, TXT, CSV, XLSX, PNG, JPG (max {MAX_FILE_SIZE_LABEL})
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES} className="hidden" onChange={handleFileChange} />
              <Select value={fileSection} onValueChange={setFileSection}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTION_LABELS).map(([k, v]) => (<SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => setAddMode(null)}><X className="h-4 w-4" /></Button>
            </div>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          <SourceList
            sources={sources} searchTerm={searchTerm} selectedId={selectedId}
            onSelectSource={setSelectedId}
            onAcceptMultiple={(ids) => acceptMultiple.mutate(ids)}
            onRejectAll={() => rejectAll.mutate()}
            onAcceptOne={(id) => acceptOne.mutate(id)}
            onRejectOne={(id) => rejectOne.mutate(id)}
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
            <DigestPanel
              digest={digest}
              onRegenerate={() => regenDigest.mutate()}
              isRegenerating={regenDigest.isPending}
              onSave={(text) => saveDigest.mutate(text)}
              isSaving={saveDigest.isPending}
              onConfirm={handleClose}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
