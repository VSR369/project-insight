/**
 * ReferenceUploadForm — File upload buttons + URL input form for reference materials.
 * Extracted from SectionReferencePanel for ≤200 line compliance.
 */

import React from 'react';
import { Upload, Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ReferenceUploadFormProps {
  disabled: boolean;
  uploading: boolean;
  canAddFile: boolean;
  canAddUrl: boolean;
  showUrlInput: boolean;
  urlValue: string;
  urlTitle: string;
  acceptedFormats: string[];
  uploadPrompt: string;
  sharingRecommendation?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadClick: () => void;
  onShowUrlInput: () => void;
  onUrlValueChange: (v: string) => void;
  onUrlTitleChange: (v: string) => void;
  onAddUrl: () => void;
  onCancelUrl: () => void;
}

export function ReferenceUploadForm({
  disabled, uploading, canAddFile, canAddUrl,
  showUrlInput, urlValue, urlTitle,
  acceptedFormats, uploadPrompt, sharingRecommendation,
  fileInputRef, onFileChange, onUploadClick, onShowUrlInput,
  onUrlValueChange, onUrlTitleChange, onAddUrl, onCancelUrl,
}: ReferenceUploadFormProps) {
  return (
    <>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          variant="outline" size="sm"
          disabled={disabled || uploading || !canAddFile}
          onClick={onUploadClick}
          className="text-xs h-7"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
          Upload File
        </Button>
        <Button
          variant="outline" size="sm"
          disabled={disabled || !canAddUrl}
          onClick={onShowUrlInput}
          className="text-xs h-7"
        >
          <Link2 className="h-3 w-3 mr-1" />
          Add Web Link
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFormats.join(',')}
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {showUrlInput && (
        <div className="border rounded-md p-2 space-y-2 bg-muted/30">
          <Input placeholder="https://..." value={urlValue} onChange={(e) => onUrlValueChange(e.target.value)} className="h-8 text-xs" />
          <Input placeholder="Title (optional)" value={urlTitle} onChange={(e) => onUrlTitleChange(e.target.value)} className="h-8 text-xs" />
          <div className="flex gap-2">
            <Button size="sm" className="text-xs h-7" onClick={onAddUrl}>Add</Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancelUrl}>Cancel</Button>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground px-1">
        {uploadPrompt}. All materials are read by AI.
        {sharingRecommendation === 'recommended' && ' Sharing with solvers is recommended for this section.'}
      </p>
    </>
  );
}
