/**
 * AdditionalContextTab — Tab 2 of Challenge Creator Form.
 * Governance-aware: QUICK = optional, STRUCTURED = recommended, CONTROLLED = required.
 * Field keys match curator section_keys in extended_brief for direct pipeline flow.
 *
 * Line-item fields use LineItemsInput (string[]) matching curator format.
 * Affected stakeholders uses structured table entries.
 */

import { useState, useCallback } from 'react';
import { Controller, useFormContext, useFieldArray } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Plus, X, Link as LinkIcon, Trash2 } from 'lucide-react';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { LineItemsInput } from '@/components/cogniblend/challenge-wizard/LineItemsInput';
import { toast } from 'sonner';
import type { CreatorFormValues } from './ChallengeCreatorForm';
import type { GovernanceMode } from '@/lib/governanceMode';
import { isFieldVisible, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

const TIMELINE_OPTIONS = [
  { value: '4w', label: '4 weeks' },
  { value: '8w', label: '8 weeks' },
  { value: '16w', label: '16 weeks' },
  { value: '32w', label: '32 weeks' },
] as const;

/** Fields rendered as LineItemsInput (string[]) */
const LINE_ITEM_FIELDS = [
  { key: 'preferred_approach' as const, label: 'Preferred Approach', placeholder: 'Any preferred technology or methodology?', addLabel: 'Add Approach' },
  { key: 'approaches_not_of_interest' as const, label: 'Approaches NOT of Interest', placeholder: "Anything you've tried or don't want?", addLabel: 'Add Exclusion' },
  { key: 'current_deficiencies' as const, label: 'Current Deficiencies', placeholder: "What's broken or missing today?", addLabel: 'Add Deficiency' },
  { key: 'root_causes' as const, label: 'Root Causes', placeholder: 'Why does this problem exist?', addLabel: 'Add Root Cause' },
] as const;

const ATTACHMENT_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  allowedTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg',
  ] as readonly string[],
  allowedExtensions: ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg'] as readonly string[],
  label: 'Reference Documents',
} as const;

const MAX_FILES = 5;
const MAX_URLS = 5;

const EMPTY_STAKEHOLDER = { stakeholder_name: '', role: '', impact_description: '', adoption_challenge: '' };

interface AdditionalContextTabProps {
  governanceMode: GovernanceMode;
  attachedFiles?: File[];
  onFilesChange?: (files: File[]) => void;
  referenceUrls?: string[];
  onUrlsChange?: (urls: string[]) => void;
}

export function AdditionalContextTab({
  governanceMode,
  attachedFiles = [],
  onFilesChange,
  referenceUrls = [],
  onUrlsChange,
}: AdditionalContextTabProps) {
  const { control, formState: { errors } } = useFormContext<CreatorFormValues>();
  const isControlled = governanceMode === 'CONTROLLED';
  const [urlInput, setUrlInput] = useState('');

  const { fields: stakeholderFields, append: addStakeholder, remove: removeStakeholder } = useFieldArray({
    control,
    name: 'affected_stakeholders',
  });

  const handleAddUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      toast.error('Please enter a valid URL (e.g. https://example.com)');
      return;
    }
    if (referenceUrls.length >= MAX_URLS) {
      toast.error(`Maximum ${MAX_URLS} reference URLs allowed`);
      return;
    }
    if (referenceUrls.includes(trimmed)) {
      toast.error('This URL has already been added');
      return;
    }
    onUrlsChange?.([...referenceUrls, trimmed]);
    setUrlInput('');
  }, [urlInput, referenceUrls, onUrlsChange]);

  const handleRemoveUrl = useCallback((index: number) => {
    onUrlsChange?.(referenceUrls.filter((_, i) => i !== index));
  }, [referenceUrls, onUrlsChange]);

  const handleFilesChange = useCallback((files: File[]) => {
    if (files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }
    onFilesChange?.(files);
  }, [onFilesChange]);

  return (
    <div className="space-y-6">
      {isControlled ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">
            <span className="font-semibold">Controlled governance:</span> All context fields below are required
            to meet compliance standards.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
          <span className="text-sm">📋</span>
          <p className="text-xs text-muted-foreground">
            These fields are optional but strongly recommended. They feed directly into the AI
            curation pipeline — richer context produces higher-quality challenge specs.
          </p>
        </div>
      )}

      {/* Context & Background — rich text (single narrative field) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Context & Background
          {isControlled && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Controller
          name="context_background"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value ?? ''}
              onChange={field.onChange}
              placeholder="Tell us about your situation, what led to this challenge, any prior attempts"
            />
          )}
        />
        {(errors as any).context_background && (
          <p className="text-xs text-destructive">{(errors as any).context_background.message}</p>
        )}
      </div>

      {/* Line-item fields */}
      {LINE_ITEM_FIELDS.map((cf) => {
        const fieldError = (errors as any)[cf.key];
        return (
          <Controller
            key={cf.key}
            name={cf.key}
            control={control}
            render={({ field }) => (
              <LineItemsInput
                value={field.value ?? ['']}
                onChange={field.onChange}
                label={cf.label}
                placeholder={cf.placeholder}
                required={isControlled}
                minItems={1}
                maxItems={10}
                addLabel={cf.addLabel}
                error={fieldError?.message ? String(fieldError.message) : undefined}
              />
            )}
          />
        );
      })}

      {/* Affected Stakeholders — structured table */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">
          Affected Stakeholders
          {isControlled && <span className="text-destructive ml-1">*</span>}
        </Label>
        <p className="text-xs text-muted-foreground">
          Who uses or is affected by this solution? Add each stakeholder with their role and impact.
        </p>

        {stakeholderFields.length > 0 && (
          <div className="space-y-3">
            {stakeholderFields.map((sh, index) => (
              <div key={sh.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground">Stakeholder {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeStakeholder(index)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  <Controller name={`affected_stakeholders.${index}.stakeholder_name`} control={control} render={({ field }) => (
                    <Input placeholder="Name / Group" className="text-base" {...field} />
                  )} />
                  <Controller name={`affected_stakeholders.${index}.role`} control={control} render={({ field }) => (
                    <Input placeholder="Role" className="text-base" {...field} />
                  )} />
                  <Controller name={`affected_stakeholders.${index}.impact_description`} control={control} render={({ field }) => (
                    <Input placeholder="Impact description" className="text-base" {...field} />
                  )} />
                  <Controller name={`affected_stakeholders.${index}.adoption_challenge`} control={control} render={({ field }) => (
                    <Input placeholder="Adoption challenge" className="text-base" {...field} />
                  )} />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button type="button" variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => addStakeholder(EMPTY_STAKEHOLDER)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Stakeholder
        </Button>
        {(errors as any).affected_stakeholders?.message && (
          <p className="text-xs text-destructive">{String((errors as any).affected_stakeholders.message)}</p>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Target Timeline</Label>
        <Controller
          name="expected_timeline"
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger className="w-full max-w-xs text-base">
                <SelectValue placeholder="Select expected timeline" />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* ── Reference Documents (File Upload) ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Reference Documents</Label>
        <p className="text-xs text-muted-foreground">
          Upload supporting files (max {MAX_FILES} files, {ATTACHMENT_CONFIG.maxSizeMB} MB each). These feed into the AI curation pipeline.
        </p>
        <FileUploadZone
          config={ATTACHMENT_CONFIG}
          multiple
          files={attachedFiles}
          onFilesChange={handleFilesChange}
          onChange={() => {}}
          value={null}
        />
      </div>

      {/* ── Reference URLs ── */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          <LinkIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
          Reference URLs
        </Label>
        <p className="text-xs text-muted-foreground">
          Add links to external references, research, or documentation (max {MAX_URLS}).
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="url"
            placeholder="https://example.com/reference"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
            className="flex-1 text-base"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddUrl} disabled={!urlInput.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {referenceUrls.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {referenceUrls.map((url, index) => (
              <div key={`${url}-${index}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{url}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => handleRemoveUrl(index)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
