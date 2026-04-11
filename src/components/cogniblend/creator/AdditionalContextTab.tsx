/**
 * AdditionalContextTab — Tab 2 of Challenge Creator Form.
 * Governance-aware: QUICK = optional, STRUCTURED = recommended, CONTROLLED = required.
 * Stakeholder editor extracted to StakeholderEditor.tsx.
 */

import { Controller, useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { CreatorPhaseTimeline, type PhaseEntry } from './CreatorPhaseTimeline';
import { AlertTriangle } from 'lucide-react';
import { LineItemsInput } from '@/components/cogniblend/challenge-wizard/LineItemsInput';
import { StakeholderEditor } from './StakeholderEditor';
import { Info } from 'lucide-react';
import type { CreatorFormValues } from './creatorFormSchema';
import type { GovernanceMode } from '@/lib/governanceMode';
import { isFieldVisible, type FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

const LINE_ITEM_FIELDS = [
  { key: 'preferred_approach' as const, label: 'Preferred Approach', placeholder: 'Any preferred technology or methodology?', addLabel: 'Add Approach' },
  { key: 'approaches_not_of_interest' as const, label: 'Approaches NOT of Interest', placeholder: "Anything you've tried or don't want?", addLabel: 'Add Exclusion' },
  { key: 'current_deficiencies' as const, label: 'Current Deficiencies', placeholder: "What's broken or missing today?", addLabel: 'Add Deficiency' },
  { key: 'root_causes' as const, label: 'Root Causes', placeholder: 'Why does this problem exist?', addLabel: 'Add Root Cause' },
] as const;

interface AdditionalContextTabProps {
  governanceMode: GovernanceMode;
  fieldRules?: FieldRulesMap;
  engagementModel?: string;
  draftChallengeId?: string;
}

export function AdditionalContextTab({ governanceMode, fieldRules, engagementModel, draftChallengeId }: AdditionalContextTabProps) {
  const { control, formState: { errors } } = useFormContext<CreatorFormValues>();
  const isControlled = governanceMode === 'CONTROLLED';
  const rules = fieldRules ?? {};

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


      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Legal documents are automatically assembled after curation review, based on your organization's CPA templates and the challenge configuration.
        </p>
      </div>
    </div>
  );
}
