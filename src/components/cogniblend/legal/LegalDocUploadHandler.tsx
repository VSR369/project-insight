/**
 * LegalDocUploadHandler — Upload .docx (mammoth) or .txt and convert to HTML.
 * Local conversion only — no persistence. Confirms before overwriting content.
 */
import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import mammoth from 'mammoth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface LegalDocUploadHandlerProps {
  onContentUploaded: (html: string, fileName: string) => void;
  hasExistingContent: boolean;
  disabled?: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPT = '.docx,.txt';

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function txtToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      const escaped = escapeHtml(trimmed).replace(/\n/g, '<br />');
      return `<p>${escaped}</p>`;
    })
    .filter(Boolean)
    .join('');
}

async function convertFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'txt') {
    const text = await file.text();
    return txtToHtml(text);
  }
  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

export function LegalDocUploadHandler({
  onContentUploaded,
  hasExistingContent,
  disabled = false,
}: LegalDocUploadHandlerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const triggerPicker = () => {
    inputRef.current?.click();
  };

  const processFile = async (file: File) => {
    setIsConverting(true);
    try {
      const html = await convertFile(file);
      onContentUploaded(html, file.name);
      toast.success(`Document uploaded: ${file.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert file';
      toast.error(message);
    } finally {
      setIsConverting(false);
      setPendingFile(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_BYTES) {
      toast.error('File exceeds the 10 MB limit');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (hasExistingContent) {
      setPendingFile(file);
      setConfirmOpen(true);
      return;
    }
    void processFile(file);
  };

  const handleConfirmReplace = () => {
    setConfirmOpen(false);
    if (pendingFile) void processFile(pendingFile);
  };

  const handleCancelReplace = () => {
    setConfirmOpen(false);
    setPendingFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerPicker}
        disabled={disabled || isConverting}
        aria-label="Upload legal document"
      >
        {isConverting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span>{isConverting ? 'Converting...' : 'Upload Document'}</span>
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing content?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite the current document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReplace}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default LegalDocUploadHandler;
