/**
 * ContextLibraryDrawer — 3-column layout: Sources | Detail | Digest.
 * Confirm & Close triggers the real handoff callback.
 */

import React, { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  useContextSources, useContextDigest, useDiscoverSources,
  useAcceptSuggestion, useRejectSuggestion, useAcceptMultipleSuggestions,
  useRejectAllSuggestions, useAddContextUrl, useDeleteContextSource,
  useUpdateSourceSharing, useUpdateSourceSections, useRegenerateDigest,
  useSaveDigest, useUploadContextFile, useReExtractSource, useUnacceptSource,
  useClearAllSources,
} from '@/hooks/cogniblend/useContextLibrary';
import { DrawerHeader } from './context-library/DrawerHeader';
import { SourceList } from './context-library/SourceList';
import { SourceDetail } from './context-library/SourceDetail';
import { DigestPanel } from './context-library/DigestPanel';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

interface ContextLibraryDrawerProps {
  challengeId: string;
  challengeTitle?: string;
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  onConfirmReview?: () => void;
}

type AddMode = 'url' | 'file' | null;

export function ContextLibraryDrawer({
  challengeId, challengeTitle, open, onClose, onOpenChange, onConfirmReview,
}: ContextLibraryDrawerProps) {
  const handleClose = () => { onClose?.(); onOpenChange?.(false); };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [urlValue, setUrlValue] = useState('');
  const [urlSection, setUrlSection] = useState('problem_statement');
  const [fileSection, setFileSection] = useState('problem_statement');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sources = [], isLoading, refetch: refetchSources } = useContextSources(challengeId);
  const { data: digest } = useContextDigest(challengeId);
  const discover = useDiscoverSources(challengeId);
  const acceptOne = useAcceptSuggestion(challengeId);
  const rejectOne = useRejectSuggestion(challengeId);
  const acceptMultiple = useAcceptMultipleSuggestions(challengeId);
  const rejectAll = useRejectAllSuggestions(challengeId);
  const addUrl = useAddContextUrl(challengeId);
  const uploadFile = useUploadContextFile(challengeId);
  const deleteSource = useDeleteContextSource(challengeId);
  const reExtract = useReExtractSource(challengeId);
  const unacceptSource = useUnacceptSource(challengeId);
  const updateSharing = useUpdateSourceSharing(challengeId);
  const updateSection = useUpdateSourceSections(challengeId);
  const regenDigest = useRegenerateDigest(challengeId);
  const saveDigest = useSaveDigest(challengeId);
  const clearAll = useClearAllSources(challengeId);

  const selectedSource = useMemo(() => sources.find(s => s.id === selectedId) || null, [sources, selectedId]);
  const suggestedCount = useMemo(() => sources.filter(s => s.discovery_status === 'suggested').length, [sources]);
  const accepted = useMemo(() => sources.filter(s => s.discovery_status === 'accepted'), [sources]);
  const acceptedCount = accepted.length;
  const extractedCount = useMemo(() => accepted.filter(s => s.extraction_status === 'completed').length, [accepted]);
  const emptyExtractionCount = acceptedCount - extractedCount;

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
      alert('File must be under 20MB');
      return;
    }
    uploadFile.mutate({ file, sectionKey: fileSection });
    setAddMode(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm & Close — real handoff: marks context as reviewed, then closes
  const handleConfirmAndClose = () => {
    onConfirmReview?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="w-[calc(100vw-80px)] max-w-none h-[calc(100vh-80px)] flex flex-col overflow-hidden p-0">
        <DrawerHeader
          challengeTitle={challengeTitle} suggestedCount={suggestedCount}
          acceptedCount={acceptedCount} extractedCount={extractedCount}
          searchTerm={searchTerm} onSearchChange={setSearchTerm}
          addMode={addMode} onSetAddMode={setAddMode}
          urlValue={urlValue} onUrlValueChange={setUrlValue}
          urlSection={urlSection} onUrlSectionChange={setUrlSection}
          fileSection={fileSection} onFileSectionChange={setFileSection}
          onAddUrl={handleAddUrl} onFileChange={handleFileChange}
          onDiscover={() => discover.mutate()} isDiscovering={discover.isPending}
          onClearAll={() => clearAll.mutate(undefined, { onSuccess: () => setSelectedId(null) })} isClearing={clearAll.isPending}
          isAddingUrl={addUrl.isPending} isUploading={uploadFile.isPending}
        />

        {/* 3-column layout */}
        <div className="flex-1 flex min-h-0">
          <SourceList
            sources={sources} searchTerm={searchTerm} selectedId={selectedId}
            onSelectSource={setSelectedId}
            onAcceptMultiple={(ids) => acceptMultiple.mutate(ids)}
            onRejectAll={() => rejectAll.mutate()}
            onAcceptOne={(id) => acceptOne.mutate(id)}
            onRejectOne={(id) => rejectOne.mutate(id)}
            onUnaccept={(id) => unacceptSource.mutate(id)}
            isAcceptPending={acceptMultiple.isPending} isRejectPending={rejectAll.isPending}
            isLoading={isLoading}
          />

          <div className="w-[30%] flex flex-col min-h-0 border-r">
            {selectedSource ? (
              <SourceDetail
                source={selectedSource}
                onAccept={(id) => acceptOne.mutate(id)}
                onReject={(id) => rejectOne.mutate(id)}
                onUnaccept={(id) => unacceptSource.mutate(id)}
                onDelete={(s) => { deleteSource.mutate(s); setSelectedId(null); }}
                onUpdateSection={(id, sk) => updateSection.mutate({ id, sectionKey: sk })}
                onUpdateSharing={(id, v) => updateSharing.mutate({ id, shared: v })}
                onReExtract={(id) => reExtract.mutate(id)}
                onRefresh={() => refetchSources()}
                isAcceptPending={acceptOne.isPending} isRejectPending={rejectOne.isPending}
                isDeletePending={deleteSource.isPending} isReExtractPending={reExtract.isPending}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a source to view details
              </div>
            )}
          </div>

          <div className="w-[40%] flex flex-col min-h-0">
            <DigestPanel
              digest={digest}
              acceptedCount={acceptedCount}
              extractedCount={extractedCount}
              emptyExtractionCount={emptyExtractionCount}
              onGenerate={() => regenDigest.mutate()}
              isGenerating={regenDigest.isPending}
              onSave={(text) => saveDigest.mutate(text)}
              isSaving={saveDigest.isPending}
              onConfirm={handleConfirmAndClose}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
