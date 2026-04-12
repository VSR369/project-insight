/**
 * DrawerHeader — Title bar, action buttons, URL/file input rows for Context Library.
 */

import React, { useRef } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Link, Sparkles, BookOpen, X, Upload, FileText } from 'lucide-react';
import { SECTION_LABELS } from './types';

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg,.webp';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '20MB';

type AddMode = 'url' | 'file' | null;

interface DrawerHeaderProps {
  challengeTitle?: string;
  suggestedCount: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  addMode: AddMode;
  onSetAddMode: (mode: AddMode) => void;
  urlValue: string;
  onUrlValueChange: (val: string) => void;
  urlSection: string;
  onUrlSectionChange: (section: string) => void;
  fileSection: string;
  onFileSectionChange: (section: string) => void;
  onAddUrl: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDiscover: () => void;
  isDiscovering: boolean;
  isAddingUrl: boolean;
  isUploading: boolean;
}

export function DrawerHeader({
  challengeTitle, suggestedCount, searchTerm, onSearchChange,
  addMode, onSetAddMode, urlValue, onUrlValueChange,
  urlSection, onUrlSectionChange, fileSection, onFileSectionChange,
  onAddUrl, onFileChange, onDiscover,
  isDiscovering, isAddingUrl, isUploading,
}: DrawerHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <DialogHeader className="shrink-0 p-4 pb-3 border-b min-h-[4rem]">
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
        <Button size="sm" variant="default" onClick={onDiscover} disabled={isDiscovering}>
          <Sparkles className="h-4 w-4 mr-1" />{isDiscovering ? 'Discovering...' : 'Re-discover Sources'}
        </Button>
        <Button size="sm" variant={addMode === 'url' ? 'secondary' : 'outline'}
          onClick={() => onSetAddMode(addMode === 'url' ? null : 'url')}>
          <Link className="h-4 w-4 mr-1" />Add URL
        </Button>
        <Button size="sm" variant={addMode === 'file' ? 'secondary' : 'outline'}
          onClick={() => onSetAddMode(addMode === 'file' ? null : 'file')} disabled={isUploading}>
          <Upload className="h-4 w-4 mr-1" />{isUploading ? 'Uploading...' : 'Upload Document'}
        </Button>
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search sources..." value={searchTerm}
            onChange={e => onSearchChange(e.target.value)} className="pl-8 h-8 w-48 text-sm" />
        </div>
      </div>

      {/* URL input row */}
      {addMode === 'url' && (
        <div className="flex items-center gap-2 mt-2">
          <Input placeholder="https://..." value={urlValue}
            onChange={e => onUrlValueChange(e.target.value)} className="h-8 text-sm flex-1"
            onKeyDown={e => { if (e.key === 'Enter') onAddUrl(); }} autoFocus />
          <Select value={urlSection} onValueChange={onUrlSectionChange}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SECTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={onAddUrl} disabled={!urlValue.trim() || isAddingUrl}>
            {isAddingUrl ? 'Adding...' : 'Add'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onSetAddMode(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File upload row */}
      {addMode === 'file' && (
        <div className="flex items-center gap-2 mt-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <Button size="sm" variant="outline"
              onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOCX, TXT, CSV, XLSX, PNG, JPG (max {MAX_FILE_SIZE_LABEL})
            </p>
          </div>
          <input ref={fileInputRef} type="file" accept={ACCEPTED_FILE_TYPES}
            className="hidden" onChange={onFileChange} />
          <Select value={fileSection} onValueChange={onFileSectionChange}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SECTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => onSetAddMode(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </DialogHeader>
  );
}
