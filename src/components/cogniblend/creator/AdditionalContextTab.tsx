/**
 * AdditionalContextTab — Tab 2 of Challenge Creator Form.
 * Governance-aware: QUICK = optional, STRUCTURED = recommended, CONTROLLED = required.
 * Stakeholder editor extracted to StakeholderEditor.tsx.
 */

import { useState, useCallback } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { CreatorPhaseTimeline, type PhaseEntry } from './CreatorPhaseTimeline';
import { AlertTriangle, Plus, X, Link as LinkIcon } from 'lucide-react';
import { FileUploadZone } from '@/components/shared/FileUploadZone';
import { LineItemsInput } from '@/components/cogniblend/challenge-wizard/LineItemsInput';
import { StakeholderEditor } from './StakeholderEditor';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import type { CreatorFormValues } from './creatorFormSchema';
import type { GovernanceMode } from '@/lib/governanceMode';
import { isFieldVisible, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

const TIMELINE_OPTIONS = [
  { value: '4w', label: '4 weeks' }, { value: '8w', label: '8 weeks' },
  { value: '16w', label: '16 weeks' }, { value: '32w', label: '32 weeks' },
] as const;

const LINE_ITEM_FIELDS = [
  { key: 'preferred_approach' as const, label: 'Preferred Approach', placeholder: 'Any preferred technology or methodology?', addLabel: 'Add Approach' },
  { key: 'approaches_not_of_interest' as const, label: 'Approaches NOT of Interest', placeholder: "Anything you've tried or don't want?", addLabel: 'Add Exclusion' },
  { key: 'current_deficiencies' as const, label: 'Current Deficiencies', placeholder: "What's broken or missing today?", addLabel: 'Add Deficiency' },
  { key: 'root_causes' as const, label: 'Root Causes', placeholder: 'Why does this problem exist?', addLabel: 'Add Root Cause' },
] as const;

const ATTACHMENT_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024, maxSizeMB: 10,
  allowedTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/png', 'image/jpeg'] as readonly string[],
  allowedExtensions: ['.pdf', '.docx', '.xlsx', '.csv', '.png', '.jpg'] as readonly string[],
  label: 'Reference Documents',
} as const;

const MAX_FILES = 5;
const MAX_URLS = 5;

interface AdditionalContextTabProps {
  governanceMode: GovernanceMode;
  fieldRules?: FieldRulesMap;
  attachedFiles?: File[];
  onFilesChange?: (files: File[]) => void;
  referenceUrls?: string[];
  onUrlsChange?: (urls: string[]) => void;
  engagementModel?: string;
  draftChallengeId?: string;
}

export function AdditionalContextTab({ governanceMode, fieldRules, attachedFiles = [], onFilesChange, referenceUrls = [], onUrlsChange, engagementModel, draftChallengeId }: AdditionalContextTabProps) {
  const { control, formState: { errors } } = useFormContext<CreatorFormValues>();
  const isControlled = governanceMode === 'CONTROLLED';
  const rules = fieldRules ?? {};
  const [urlInput, setUrlInput] = useState('');

  const handleAddUrl = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    try { new URL(trimmed); } catch { toast.error('Please enter a valid URL'); return; }
    if (referenceUrls.length >= MAX_URLS) { toast.error(`Maximum ${MAX_URLS} URLs allowed`); return; }
    if (referenceUrls.includes(trimmed)) { toast.error('URL already added'); return; }
    onUrlsChange?.([...referenceUrls, trimmed]);
    setUrlInput('');
  }, [urlInput, referenceUrls, onUrlsChange]);

  return (
    <div className="space-y-6">
      {isControlled ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive"><span className="font-semibold">Controlled governance:</span> All context fields below are required.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
          <span className="text-sm">📋</span>
          <p className="text-xs text-muted-foreground">These fields are optional but recommended. Richer context produces higher-quality AI curation.</p>
        </div>
      )}

      {isFieldVisible(rules, 'context_background') && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Context & Background{isControlled && <span className="text-destructive ml-1">*</span>}</Label>
          <Controller name="context_background" control={control} render={({ field }) => (
            <RichTextEditor value={field.value ?? ''} onChange={field.onChange} placeholder="Tell us about your situation, what led to this challenge" />
          )} />
          {errors.context_background && <p className="text-xs text-destructive">{errors.context_background.message}</p>}
        </div>
      )}

      {LINE_ITEM_FIELDS.filter((cf) => isFieldVisible(rules, cf.key)).map((cf) => (
        <Controller key={cf.key} name={cf.key} control={control} render={({ field }) => (
          <LineItemsInput value={field.value ?? ['']} onChange={field.onChange} label={cf.label} placeholder={cf.placeholder} required={isControlled} minItems={1} maxItems={10} addLabel={cf.addLabel}
            error={errors[cf.key]?.message ? String(errors[cf.key]?.message) : undefined} />
        )} />
      ))}

      {isFieldVisible(rules, 'affected_stakeholders') && <StakeholderEditor isControlled={isControlled} />}

      {isFieldVisible(rules, 'expected_timeline') && (
        <Controller name="expected_timeline" control={control} render={({ field: tlField }) => (
          <Controller name="phase_durations" control={control} render={({ field: pdField }) => (
            <CreatorPhaseTimeline
              governanceMode={governanceMode as 'STRUCTURED' | 'CONTROLLED'}
              value={{ expected_timeline: tlField.value, phase_durations: pdField.value as PhaseEntry[] }}
              onChange={(val) => { tlField.onChange(val.expected_timeline); pdField.onChange(val.phase_durations ?? []); }}
            />
          )} />
        )} />
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">Reference Documents</Label>
        <p className="text-xs text-muted-foreground">Upload supporting files (max {MAX_FILES}, {ATTACHMENT_CONFIG.maxSizeMB} MB each).</p>
        <FileUploadZone config={ATTACHMENT_CONFIG} multiple files={attachedFiles} onFilesChange={(f) => { if (f.length > MAX_FILES) { toast.error(`Max ${MAX_FILES} files`); return; } onFilesChange?.(f); }} onChange={() => {}} value={null} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium"><LinkIcon className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />Reference URLs</Label>
        <div className="flex items-center gap-2">
          <Input type="url" placeholder="https://example.com/reference" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }} className="flex-1 text-base" />
          <Button type="button" variant="outline" size="sm" onClick={handleAddUrl} disabled={!urlInput.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
        {referenceUrls.length > 0 && (
          <div className="space-y-1.5 mt-2">
            {referenceUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{url}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => onUrlsChange?.(referenceUrls.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Legal documents are automatically assembled after curation review, based on your organization's CPA templates and the challenge configuration.
        </p>
      </div>
    </div>
  );
}
