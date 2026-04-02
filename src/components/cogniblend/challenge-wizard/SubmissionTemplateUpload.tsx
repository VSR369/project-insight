/**
 * SubmissionTemplateUpload — File upload for submission template (PDF/DOCX).
 * Extracted from StepRequirements.tsx.
 */

import { useState, useRef, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Upload, FileText, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

const TEMPLATE_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const TEMPLATE_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function SubmissionTemplateUpload({ form }: { form: UseFormReturn<ChallengeFormValues> }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const templateUrl = form.watch('submission_template_url') ?? '';
  const fileName = templateUrl ? templateUrl.split('/').pop() : '';

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!TEMPLATE_ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF and DOCX files are allowed.');
      return;
    }
    if (file.size > TEMPLATE_MAX_SIZE) {
      toast.error('File must be under 10 MB.');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() ?? 'pdf';
    const path = `submission-templates/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('challenge-assets')
      .upload(path, file, { contentType: file.type });

    if (uploadErr) {
      toast.error(`Upload failed: ${uploadErr.message}`);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('challenge-assets')
      .getPublicUrl(path);

    if (urlData?.publicUrl) {
      form.setValue('submission_template_url', urlData.publicUrl, { shouldDirty: true });
      toast.success('Template uploaded successfully');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [form]);

  const handleRemove = useCallback(() => {
    form.setValue('submission_template_url', '', { shouldDirty: true });
  }, [form]);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        Submission Template{' '}
        <span className="text-xs text-muted-foreground ml-1">(optional)</span>
      </Label>
      <p className="text-xs text-muted-foreground">
        Upload a PDF or DOCX template for solvers to use when preparing submissions.
      </p>

      {templateUrl ? (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate flex-1 min-w-0"
          >
            {fileName}
          </a>
          <button
            type="button"
            onClick={handleRemove}
            className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed px-4 py-4 transition-colors',
            uploading
              ? 'border-muted bg-muted/20 cursor-wait'
              : 'border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer',
          )}
        >
          <Upload className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {uploading ? 'Uploading...' : 'Click to upload template (PDF or DOCX, max 10 MB)'}
          </span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
