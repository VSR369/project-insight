/**
 * Step 2 — Requirements
 *
 * Fields:
 *   1. Deliverables — dynamic sortable list, min 1 required
 *   2. Permitted Artifact Types — checkbox group based on maturity level
 *   3. Submission Guidelines — textarea (optional LW, required ENT)
 *   4. Solver Eligibility — checkboxes: Individual, Organization/Team, Solution Cluster
 *   5. IP Model — dropdown with info tooltips
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import {
  Plus,
  Trash2,
  GripVertical,
  Info,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ChallengeFormValues } from './challengeFormSchema';

/* ─── Constants ──────────────────────────────────────── */

const ARTIFACT_TIERS: Record<string, string[]> = {
  blueprint: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram'],
  poc: ['Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram', 'Data/Evidence', 'Video Demo'],
  prototype: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo',
    'Source Code', 'Hardware Specs', 'API Documentation',
  ],
  pilot: [
    'Document (PDF, DOCX)', 'Presentation (PPTX)', 'Diagram',
    'Data/Evidence', 'Video Demo',
    'Source Code', 'Hardware Specs', 'API Documentation',
    'Field Data', 'Deployment Guide', 'Metrics Report',
  ],
};

const IP_OPTIONS = [
  {
    value: 'exclusive_assignment',
    label: 'Exclusive Assignment',
    short: 'You acquire full IP ownership',
    tooltip: 'The solver transfers all intellectual property rights to you upon acceptance. They may not use, license, or sell the solution to anyone else.',
  },
  {
    value: 'non_exclusive_license',
    label: 'Non-Exclusive License',
    short: 'Solver keeps IP, you get license',
    tooltip: 'The solver retains ownership but grants you a perpetual, non-exclusive license to use the solution. The solver may license it to others.',
  },
  {
    value: 'exclusive_license',
    label: 'Exclusive License',
    short: 'Solver keeps IP, exclusive use for you',
    tooltip: 'The solver retains ownership but grants you an exclusive license. No other party (including the solver) may use or license the solution.',
  },
  {
    value: 'joint_ownership',
    label: 'Joint Ownership',
    short: 'Both parties co-own',
    tooltip: 'Both you and the solver share ownership of the intellectual property. Either party may use or license it, subject to the agreement terms.',
  },
  {
    value: 'no_transfer',
    label: 'No Transfer',
    short: 'Advisory only',
    tooltip: 'No intellectual property transfer occurs. The engagement is advisory in nature — the solver provides guidance, recommendations, or consulting only.',
  },
] as const;

const MATURITY_IP_DEFAULTS: Record<string, string> = {
  blueprint: 'non_exclusive_license',
  poc: 'non_exclusive_license',
  prototype: 'exclusive_assignment',
  pilot: 'exclusive_assignment',
};

/* ─── Props ──────────────────────────────────────────── */

interface StepRequirementsProps {
  form: UseFormReturn<ChallengeFormValues>;
  mandatoryFields: string[];
  isLightweight: boolean;
}

/* ─── Component ──────────────────────────────────────── */

export function StepRequirements({ form, mandatoryFields, isLightweight }: StepRequirementsProps) {
  const { register, formState: { errors }, control, watch, setValue } = form;

  const isRequired = (field: string) => mandatoryFields.includes(field);

  // ── Deliverables ──
  const deliverablesList = watch('deliverables_list') ?? [''];
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addDeliverable = () => setValue('deliverables_list', [...deliverablesList, '']);

  const removeDeliverable = (index: number) => {
    if (deliverablesList.length <= 1) return;
    setValue('deliverables_list', deliverablesList.filter((_: string, i: number) => i !== index));
  };

  const updateDeliverable = (index: number, value: string) => {
    const updated = [...deliverablesList];
    updated[index] = value;
    setValue('deliverables_list', updated);
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragEnd = () => setDragIndex(null);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...deliverablesList];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setValue('deliverables_list', reordered);
    setDragIndex(index);
  };

  // ── Artifact types (driven by maturity level) ──
  const maturityLevel = watch('maturity_level');
  const selectedArtifacts = watch('permitted_artifact_types') ?? [];
  const availableArtifacts = ARTIFACT_TIERS[maturityLevel] ?? [];

  // Auto-select all artifacts when maturity changes
  useEffect(() => {
    if (maturityLevel && ARTIFACT_TIERS[maturityLevel]) {
      setValue('permitted_artifact_types', [...ARTIFACT_TIERS[maturityLevel]]);
    }
  }, [maturityLevel, setValue]);

  const toggleArtifact = (artifact: string) => {
    const current = selectedArtifacts;
    if (current.includes(artifact)) {
      setValue('permitted_artifact_types', current.filter((a: string) => a !== artifact));
    } else {
      setValue('permitted_artifact_types', [...current, artifact]);
    }
  };

  // ── IP model default ──
  const ipModel = watch('ip_model');
  useEffect(() => {
    if (isLightweight && maturityLevel && !ipModel) {
      const defaultIp = MATURITY_IP_DEFAULTS[maturityLevel];
      if (defaultIp) setValue('ip_model', defaultIp);
    }
  }, [maturityLevel, isLightweight, ipModel, setValue]);

  return (
    <div className="space-y-6">
      {/* ── 1. Deliverables ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Deliverables <span className="text-destructive">*</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          List the expected outputs from solvers. Drag to reorder.
        </p>

        <div className="space-y-2">
          {deliverablesList.map((item: string, index: number) => (
            <div
              key={index}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background p-1 transition-shadow',
                dragIndex === index && 'shadow-md ring-2 ring-primary/30',
              )}
            >
              <button
                type="button"
                className="cursor-grab shrink-0 p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                tabIndex={-1}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <Input
                placeholder="Describe a specific deliverable..."
                value={item}
                onChange={(e) => updateDeliverable(index, e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 text-base"
              />
              {deliverablesList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDeliverable(index)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addDeliverable}
          className="text-primary hover:text-primary/80"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Deliverable
        </Button>

        {errors.deliverables_list && (
          <p className="text-xs text-destructive">{errors.deliverables_list.message}</p>
        )}
      </div>

      {/* ── 2. Permitted Artifact Types ── */}
      {maturityLevel && availableArtifacts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Permitted Artifact Types
          </Label>
          <p className="text-xs text-muted-foreground">
            Auto-populated based on maturity level. Uncheck any you don't need.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {availableArtifacts.map((artifact) => {
              const checked = selectedArtifacts.includes(artifact);
              return (
                <label
                  key={artifact}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors',
                    checked
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-background hover:bg-muted/50',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleArtifact(artifact)}
                  />
                  <span className="text-sm">{artifact}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. Submission Guidelines ── */}
      <div className="space-y-1.5">
        <Label htmlFor="submission_guidelines" className="text-sm font-medium">
          Submission Guidelines{' '}
          {!isLightweight && isRequired('submission_guidelines') && (
            <span className="text-destructive">*</span>
          )}
          {isLightweight && (
            <span className="text-xs text-muted-foreground ml-1">(optional)</span>
          )}
        </Label>
        <Textarea
          id="submission_guidelines"
          placeholder="Any specific instructions for solvers about how to prepare and submit their solutions."
          rows={4}
          className="text-base resize-none"
          {...register('submission_guidelines')}
        />
        {errors.submission_guidelines && (
          <p className="text-xs text-destructive">{errors.submission_guidelines.message}</p>
        )}
      </div>

      {/* ── 3b. Upload Submission Template ── */}
      <SubmissionTemplateUpload form={form} />

      {/* ── 4. Solver Eligibility (moved to Step 5 — showing read-only note) ── */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Solver eligibility is configured in <strong>Step 5 — Provider Eligibility & Matchmaking</strong>.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">
          IP Model{' '}
          {!isLightweight && isRequired('ip_model') && (
            <span className="text-destructive">*</span>
          )}
          {isLightweight && (
            <span className="text-xs text-muted-foreground ml-1">(optional)</span>
          )}
        </Label>
        <p className="text-xs text-muted-foreground">
          Select how intellectual property will be handled
        </p>

        <Controller
          name="ip_model"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="text-base">
                <SelectValue placeholder="Select IP ownership model" />
              </SelectTrigger>
              <SelectContent>
                <TooltipProvider delayDuration={200}>
                  {IP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">— {opt.short}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs text-xs">
                            {opt.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </SelectItem>
                  ))}
                </TooltipProvider>
              </SelectContent>
            </Select>
          )}
        />
        {errors.ip_model && (
          <p className="text-xs text-destructive">{errors.ip_model.message}</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Submission Template Upload
   ═══════════════════════════════════════════════════════════ */

const TEMPLATE_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const TEMPLATE_MAX_SIZE = 10 * 1024 * 1024; // 10MB

function SubmissionTemplateUpload({ form }: { form: UseFormReturn<ChallengeFormValues> }) {
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
  );
}
