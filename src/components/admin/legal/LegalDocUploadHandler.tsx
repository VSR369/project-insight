/**
 * LegalDocUploadHandler — Upload button + file picker for legal document editor.
 * Accepts .docx, .txt. Converts to HTML and replaces TipTap content.
 */
import * as React from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLegalDocUpload } from '@/hooks/admin/useLegalDocUpload';
import { LegalDocUploadConfirmDialog } from './LegalDocUploadConfirmDialog';

const ACCEPTED_TYPES = '.docx,.txt';

interface LegalDocUploadHandlerProps {
  templateId?: string;
  hasContent: boolean;
  onContentUploaded: (html: string, fileName: string, storageUrl: string | null) => void;
}

export function LegalDocUploadHandler({
  templateId,
  hasContent,
  onContentUploaded,
}: LegalDocUploadHandlerProps) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const { uploadAndConvert, isUploading } = useLegalDocUpload();
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
    e.target.value = '';

    if (hasContent) {
      setPendingFile(file);
    } else {
      processFile(file);
    }
  };

  const processFile = async (file: File) => {
    const result = await uploadAndConvert(file, templateId);
    if (result) {
      onContentUploaded(result.html, result.fileName, result.storageUrl);
    }
  };

  const handleConfirm = () => {
    if (pendingFile) {
      processFile(pendingFile);
      setPendingFile(null);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1.5 h-3.5 w-3.5" />
        )}
        <span className="hidden lg:inline">Upload Document</span>
      </Button>

      <LegalDocUploadConfirmDialog
        open={!!pendingFile}
        fileName={pendingFile?.name ?? ''}
        onConfirm={handleConfirm}
        onCancel={() => setPendingFile(null)}
      />
    </>
  );
}
