/**
 * useLegalDocUpload — Handles file upload + conversion to HTML for legal docs.
 * Supports .docx (via mammoth.js), .txt, and .pdf (text extraction).
 */
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { handleMutationError } from '@/lib/errorHandler';
import { sanitizeFileName } from '@/lib/sanitizeFileName';
import { toast } from 'sonner';
import mammoth from 'mammoth';

interface UploadResult {
  html: string;
  fileName: string;
  storageUrl: string | null;
}

export function useLegalDocUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadAndConvert = async (
    file: File,
    templateId?: string
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      let html = '';

      if (ext === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        html = result.value;
        if (result.messages.length > 0) {
          toast.info(`Conversion notes: ${result.messages.length} warnings`);
        }
      } else if (ext === 'txt') {
        const text = await file.text();
        html = text
          .split('\n')
          .map((line) => `<p>${line || '&nbsp;'}</p>`)
          .join('');
      } else if (ext === 'pdf') {
        toast.error('PDF text extraction is not yet supported. Please use .docx or .txt.');
        return null;
      } else {
        toast.error(`Unsupported file type: .${ext}`);
        return null;
      }

      // Upload original file to storage
      let storageUrl: string | null = null;
      if (templateId) {
        const safeName = sanitizeFileName(file.name);
        const storagePath = `templates/${templateId}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('legal-documents')
          .upload(storagePath, file, { upsert: true });

        if (uploadError) {
          handleMutationError(new Error(uploadError.message), {
            operation: 'upload_legal_doc_file',
          });
        } else {
          const { data: urlData } = supabase.storage
            .from('legal-documents')
            .getPublicUrl(storagePath);
          storageUrl = urlData.publicUrl;
        }
      }

      toast.success(`"${file.name}" converted successfully`);
      return { html, fileName: file.name, storageUrl };
    } catch (err) {
      handleMutationError(err instanceof Error ? err : new Error(String(err)), {
        operation: 'convert_legal_doc_file',
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadAndConvert, isUploading };
}
