/**
 * Step 6 — Solution Templates & Legal Documents
 * Solution template upload + legal document template upload.
 */

import { useState, useRef, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Upload, FileText, X, Shield, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  isQuick: boolean;
  fieldRules?: Record<string, { visibility: string; minLength: number | null; maxLength: number | null; defaultValue: string | null }>;
}

const LEGAL_DOC_TYPES = [
  { type: 'TERMS_AND_CONDITIONS', label: 'Challenge Life Cycle Management Terms & Conditions', tier: 'entry', required: true },
  { type: 'NDA', label: 'Non-Disclosure Agreement', tier: 'entry', required: true },
  { type: 'PARTICIPATION_AGREEMENT', label: 'Participation Agreement', tier: 'entry', required: true },
  { type: 'IP_ASSIGNMENT', label: 'IP Assignment Deed', tier: 'solution', required: false, controlledOnly: true },
  { type: 'ESCROW_AGREEMENT', label: 'Escrow Agreement', tier: 'solution', required: false, controlledOnly: true },
];

export function StepTemplates({ form, isQuick }: StepTemplatesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const legalInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploading, setUploading] = useState(false);
  const [legalUploading, setLegalUploading] = useState<string | null>(null);
  const [legalFiles, setLegalFiles] = useState<Record<string, { name: string; url: string }>>({});

  const templateUrl = form.watch('submission_template_url') ?? '';
  const fileName = templateUrl ? templateUrl.split('/').pop() : '';

  // Solution category
  const solutionCategoryDesc = form.watch('solution_category_description') ?? '';

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
    const path = `solution-templates/${crypto.randomUUID()}.${ext}`;
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

  const handleLegalUpload = useCallback(async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
    setLegalUploading(docType);
    const ext = file.name.split('.').pop() ?? 'pdf';
    const path = `legal-templates/${docType.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('challenge-assets')
      .upload(path, file, { contentType: file.type });
    if (uploadErr) {
      toast.error(`Upload failed: ${uploadErr.message}`);
      setLegalUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('challenge-assets').getPublicUrl(path);
    if (urlData?.publicUrl) {
      setLegalFiles((prev) => ({ ...prev, [docType]: { name: file.name, url: urlData.publicUrl } }));
      toast.success(`${docType} document uploaded`);
    }
    setLegalUploading(null);
    const ref = legalInputRefs.current[docType];
    if (ref) ref.value = '';
  }, []);

  const removeLegalFile = (docType: string) => {
    setLegalFiles((prev) => {
      const next = { ...prev };
      delete next[docType];
      return next;
    });
  };

  const visibleDocs = LEGAL_DOC_TYPES.filter((d) => !d.controlledOnly || !isQuick);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-foreground mb-1">Solution Templates & Legal Documents</h3>
        <p className="text-sm text-muted-foreground">
          Upload solution templates and legal documents for this challenge.
        </p>
      </div>

      {/* Solution Category Description */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Solution Category Description{' '}
          <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Describe the type of solution expected from solvers.
        </p>
        <Textarea
          placeholder="e.g., We are looking for a working prototype with documentation that demonstrates…"
          rows={3}
          className="text-base resize-none"
          value={solutionCategoryDesc}
          onChange={(e) => form.setValue('solution_category_description', e.target.value, { shouldDirty: true })}
        />
      </div>

      {/* Solution Template Upload (renamed from Submission Template) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Solution Template{' '}
          <span className="text-xs text-muted-foreground ml-1">(optional)</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Upload a PDF or DOCX template for solvers to use when preparing solutions.
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

      {/* Legal Document Templates — with upload capability */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Legal Document Templates</Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Platform-standard legal templates will be applied by default. You can upload custom versions below.
        </p>

        <div className="space-y-2">
          {visibleDocs.map((doc) => {
            const uploaded = legalFiles[doc.type];
            const isCurrentlyUploading = legalUploading === doc.type;

            return (
              <Card key={doc.type} className="border-border">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
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
                      {uploaded ? (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/10 text-primary">Custom</Badge>
                      ) : (
                        <CheckCircle className="h-4 w-4 text-[hsl(155,68%,37%)]" />
                      )}
                    </div>
                  </div>

                  {/* Uploaded file or upload button */}
                  {uploaded ? (
                    <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <a href={uploaded.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline truncate flex-1 min-w-0">{uploaded.name}</a>
                      <button type="button" onClick={() => removeLegalFile(doc.type)}
                        className="p-0.5 hover:text-destructive text-muted-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isCurrentlyUploading}
                      onClick={() => legalInputRefs.current[doc.type]?.click()}
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Upload className="h-3 w-3" />
                      {isCurrentlyUploading ? 'Uploading…' : 'Upload custom document'}
                    </button>
                  )}
                  <input
                    ref={(el) => { legalInputRefs.current[doc.type] = el; }}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => handleLegalUpload(doc.type, e)}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground italic">
          Platform defaults will be applied for documents without a custom upload.
        </p>
      </div>
    </div>
  );
}
