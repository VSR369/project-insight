/**
 * FileUploadZone Component
 * 
 * Reusable drag-and-drop file upload with validation, preview, and remove.
 * Configurable for different file types and size limits.
 */

import React, { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploadConfig {
  maxSizeBytes: number;
  maxSizeMB: number;
  allowedTypes: readonly string[];
  allowedExtensions: readonly string[];
  label: string;
}

interface FileUploadZoneProps {
  config: FileUploadConfig;
  value?: File | null;
  onChange: (file: File | null) => void;
  multiple?: boolean;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

export function FileUploadZone({
  config,
  value,
  onChange,
  multiple = false,
  files = [],
  onFilesChange,
  className,
  disabled = false,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!config.allowedTypes.includes(file.type)) {
      toast.error(`Invalid file format. Please upload a ${config.allowedExtensions.join(', ')} file.`);
      return false;
    }
    if (file.size > config.maxSizeBytes) {
      toast.error(`File size exceeds the maximum limit of ${config.maxSizeMB} MB.`);
      return false;
    }
    return true;
  }, [config]);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles = Array.from(fileList).filter(validateFile);
    if (newFiles.length === 0) return;

    if (multiple && onFilesChange) {
      onFilesChange([...files, ...newFiles]);
    } else if (newFiles[0]) {
      onChange(newFiles[0]);
    }
  }, [validateFile, multiple, files, onFilesChange, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [disabled, handleFiles]);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset for re-upload
    }
  }, [handleFiles]);

  const removeFile = useCallback((index?: number) => {
    if (multiple && onFilesChange && index !== undefined) {
      onFilesChange(files.filter((_, i) => i !== index));
    } else {
      onChange(null);
    }
  }, [multiple, files, onFilesChange, onChange]);

  const isImage = config.allowedTypes.some(t => t.startsWith('image/'));

  // Show uploaded file(s)
  const displayFiles = multiple ? files : value ? [value] : [];

  if (displayFiles.length > 0 && !multiple) {
    const file = displayFiles[0];
    return (
      <div className={cn('border rounded-lg p-3 flex items-center gap-3 bg-muted/50', className)}>
        {isImage ? <ImageIcon className="w-5 h-5 text-muted-foreground shrink-0" /> : <FileText className="w-5 h-5 text-muted-foreground shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => removeFile()} disabled={disabled} className="shrink-0">
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && !disabled && 'border-border hover:border-primary/50 hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Drag & drop or <span className="text-primary font-medium">click to upload</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {config.allowedExtensions.join(', ').toUpperCase()} · Max {config.maxSizeMB} MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={config.allowedTypes.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* Multiple files list */}
      {multiple && files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="border rounded-lg p-2 flex items-center gap-3 bg-muted/50">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeFile(index)} disabled={disabled} className="shrink-0 h-7 w-7">
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
