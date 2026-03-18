/**
 * Step 6 — Templates & Legal Documents
 * Submission template upload + legal document template preview.
 * Seamlessly integrates legal/NDA/IP documents for solo users.
 */

import { useState, useRef, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Upload, FileText, X, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

const TEMPLATE_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const TEMPLATE_MAX_SIZE = 10 * 1024 * 1024;

interface StepTemplatesProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

const LEGAL_DOC_TYPES = [
  { type: 'NDA', label: 'Non-Disclosure Agreement', tier: 'entry', required: true },
  { type: 'PARTICIPATION_AGREEMENT', label: 'Participation Agreement', tier: 'entry', required: true },
  { type: 'IP_ASSIGNMENT', label: 'IP Assignment Deed', tier: 'solution', required: false, enterpriseOnly: true },
  { type: 'ESCROW_AGREEMENT', label: 'Escrow Agreement', tier: 'solution', required: false, enterpriseOnly: true },
];

export function StepTemplates({ form, isLightweight }: StepTemplatesProps) {
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
    const { data: urlData } = supabase.storage.from('challenge-assets').getPublicUrl(path);
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

  const visibleDocs = LEGAL_DOC_TYPES.filter((d) => !d.enterpriseOnly || !isLightweight);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Templates & Legal Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload submission templates and review legal documents that will be applied to this challenge.
        </p>
      </div>

      {/* Submission Template Upload */}
      <div className="space-y-2">
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
              {uploading ? 'Uploading…' : 'Click to upload PDF or DOCX (max 10 MB)'}
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

      {/* Legal Document Templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Legal Document Templates</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          These platform-standard legal templates will be automatically applied. You can customize them after challenge creation on the Legal Documents page.
        </p>

        <div className="space-y-2">
          {visibleDocs.map((doc) => (
            <Card key={doc.type} className="border-border">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {doc.tier === 'entry' ? 'Required at enrollment' : 'Required at solution acceptance'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    {doc.tier === 'entry' ? 'Tier 1' : 'Tier 2'}
                  </Badge>
                  <CheckCircle className="h-4 w-4 text-[hsl(155,68%,37%)]" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          Platform defaults will be applied automatically. Custom documents can be uploaded after saving this challenge.
        </p>
      </div>
    </div>
  );
}
