/**
 * SectionReferencePanel — Collapsible per-section panel for reference materials.
 * Upload form extracted to ReferenceUploadForm. Data layer in useSectionAttachments.
 */

import React, { useRef, useState } from 'react';
import { SECTION_UPLOAD_CONFIG, SHARING_GUIDANCE } from '@/lib/cogniblend/sectionUploadConfig';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Paperclip, ChevronDown, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AttachmentCard } from './AttachmentCard';
import { ReferenceUploadForm } from './ReferenceUploadForm';
import { useSectionAttachments } from '@/hooks/cogniblend/useSectionAttachments';

interface SectionReferencePanelProps {
  challengeId: string;
  sectionKey: string;
  disabled?: boolean;
  onOpenLibrary?: (sectionKey: string) => void;
}

export function SectionReferencePanel({ challengeId, sectionKey, disabled = false, onOpenLibrary }: SectionReferencePanelProps) {
  const config = SECTION_UPLOAD_CONFIG[sectionKey];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlTitle, setUrlTitle] = useState('');

  const {
    attachments, uploading, uploadFile, addUrl,
    updateAttachment, removeAttachment, retryExtraction,
  } = useSectionAttachments(challengeId, sectionKey, config);

  const handleAddUrl = async () => {
    const success = await addUrl(urlValue, urlTitle);
    if (success) {
      setUrlValue('');
      setUrlTitle('');
      setShowUrlInput(false);
    }
  };

  if (!config?.enabled) return null;

  const fileCount = attachments.filter(a => a.source_type === 'file').length;
  const urlCount = attachments.filter(a => a.source_type === 'url').length;
  const sharingGuidance = SHARING_GUIDANCE[sectionKey];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <button type="button" className={cn('flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-md w-full text-left transition-colors', 'text-muted-foreground hover:text-foreground hover:bg-muted/50', isOpen && 'bg-muted/50 text-foreground')}>
          <Paperclip className="h-3.5 w-3.5" />
          <span>Reference Materials</span>
          {attachments.length > 0 && <span className="bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{attachments.length}</span>}
          <ChevronDown className={cn('h-3 w-3 ml-auto transition-transform', isOpen && 'rotate-180')} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {attachments.map((att) => (
          <AttachmentCard key={att.id} att={att} sectionKey={sectionKey} disabled={disabled} sharingGuidance={sharingGuidance}
            onUpdate={updateAttachment}
            onRemove={removeAttachment}
            onRetry={retryExtraction} />
        ))}
        <ReferenceUploadForm
          disabled={disabled} uploading={uploading}
          canAddFile={fileCount < config.maxFiles} canAddUrl={urlCount < config.maxUrls}
          showUrlInput={showUrlInput} urlValue={urlValue} urlTitle={urlTitle}
          acceptedFormats={config.acceptedFormats} uploadPrompt={config.uploadPrompt}
          sharingRecommendation={config.sharingRecommendation}
          fileInputRef={fileInputRef}
          onFileChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); e.target.value = ''; }}
          onUploadClick={() => fileInputRef.current?.click()}
          onShowUrlInput={() => setShowUrlInput(true)}
          onUrlValueChange={setUrlValue} onUrlTitleChange={setUrlTitle}
          onAddUrl={handleAddUrl}
          onCancelUrl={() => { setShowUrlInput(false); setUrlValue(''); setUrlTitle(''); }}
        />
        {onOpenLibrary && (
          <button type="button" onClick={() => onOpenLibrary(sectionKey)} className="flex items-center gap-1 text-[10px] text-primary hover:underline px-1 mt-1">
            <BookOpen className="h-3 w-3" />View all sources in Context Library
          </button>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
