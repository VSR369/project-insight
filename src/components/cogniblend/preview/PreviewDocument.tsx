/**
 * PreviewDocument — Scrollable document body rendering all groups/sections.
 * Composes SECTIONS renderers + special sections into a seamless document.
 * Inline editing writes directly to DB via supabase client.
 */

import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SECTIONS, GROUPS, SECTION_MAP, LOCKED_SECTIONS } from '@/lib/cogniblend/curationSectionDefs';
import { isControlledMode, resolveGovernanceMode } from '@/lib/governanceMode';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import { EXTENDED_BRIEF_FIELD_MAP } from '@/lib/cogniblend/curationSectionFormats';
import { PreviewGroupHeader } from './PreviewGroupHeader';
import { PreviewSection } from './PreviewSection';
import { PreviewOrgSection } from './PreviewOrgSection';
import { PreviewLegalSection } from './PreviewLegalSection';
import { PreviewEscrowSection } from './PreviewEscrowSection';
import { PreviewDigestSection } from './PreviewDigestSection';
import { PreviewSectionEditor } from './PreviewSectionEditor';
import type { ChallengeData, LegalDocDetail, EscrowRecord } from '@/lib/cogniblend/curationTypes';
import type { OrgData, DigestData, PreviewAttachment } from './usePreviewData';

interface PreviewDocumentProps {
  challenge: ChallengeData;
  orgData: OrgData | null;
  legalDetails: LegalDocDetail[];
  escrowRecord: EscrowRecord | null;
  digest: DigestData | null;
  attachments: PreviewAttachment[];
  canEditSection: (key: string) => boolean;
  isGlobalReadOnly: boolean;
}

/** Groups for the preview document (extends GROUPS with special sections) */
const PREVIEW_GROUPS = [
  { id: 'organization', label: 'Organization', icon: '🏢' },
  ...GROUPS.filter((g) => g.id !== 'organization').map((g) => ({
    id: g.id,
    label: g.label.replace(/^\d+\.\s*/, ''),
    icon: g.icon,
  })),
  { id: 'context_digest', label: 'Context Digest', icon: '📚' },
];

export { PREVIEW_GROUPS };

export function PreviewDocument({
  challenge,
  orgData,
  legalDetails,
  escrowRecord,
  digest,
  attachments,
  canEditSection,
}: PreviewDocumentProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState(false);
  const queryClient = useQueryClient();

  const isControlled = useMemo(
    () => isControlledMode(resolveGovernanceMode(challenge.governance_mode_override ?? challenge.governance_profile)),
    [challenge.governance_mode_override, challenge.governance_profile],
  );

  const lcComplete = (challenge as unknown as Record<string, unknown>).lc_compliance_complete === true;
  const fcComplete = (challenge as unknown as Record<string, unknown>).fc_compliance_complete === true;

  const extendedBrief = useMemo(
    () => parseJson<Record<string, unknown>>(challenge.extended_brief),
    [challenge.extended_brief],
  );

  const filledSections = useMemo(() => {
    const filled = new Set<string>();
    for (const s of SECTIONS) {
      if (s.isFilled(challenge, [], legalDetails, escrowRecord)) {
        filled.add(s.key);
      }
    }
    return filled;
  }, [challenge, legalDetails, escrowRecord]);

  const handleStartEdit = (key: string) => {
    setEditingSection(key);
  };

  const handleCancelEdit = useCallback(() => {
    setEditingSection(null);
  }, []);

  /** Write section value to DB, invalidate cache, close editor */
  const handleSectionSave = useCallback(async (sectionKey: string, value: unknown) => {
    setSavingSection(true);
    try {
      const jsonbField = EXTENDED_BRIEF_FIELD_MAP[sectionKey];
      if (jsonbField) {
        // extended_brief subsection: read-modify-write
        const { data: row } = await supabase
          .from('challenges')
          .select('extended_brief')
          .eq('id', challenge.id)
          .single();
        const current = parseJson<Record<string, unknown>>(row?.extended_brief ?? null) ?? {};
        current[jsonbField] = value;
        const { error } = await supabase
          .from('challenges')
          .update({ extended_brief: current as Record<string, unknown> } as Record<string, unknown>)
          .eq('id', challenge.id);
        if (error) throw new Error(error.message);
      } else {
        // Direct column
        const { error } = await supabase
          .from('challenges')
          .update({ [sectionKey]: value } as Record<string, unknown>)
          .eq('id', challenge.id);
        if (error) throw new Error(error.message);
      }

      await queryClient.invalidateQueries({ queryKey: ['challenge-preview', challenge.id] });
      await queryClient.invalidateQueries({ queryKey: ['curation-review', challenge.id] });
      setEditingSection(null);
      toast.success('Section saved');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
    } finally {
      setSavingSection(false);
    }
  }, [challenge.id, queryClient]);

  /** Get current DB value for a section key */
  const getSectionValue = useCallback((sectionKey: string): unknown => {
    const jsonbField = EXTENDED_BRIEF_FIELD_MAP[sectionKey];
    if (jsonbField && extendedBrief) {
      return extendedBrief[jsonbField] ?? '';
    }
    return (challenge as unknown as Record<string, unknown>)[sectionKey] ?? '';
  }, [challenge, extendedBrief]);

  const renderStandardSection = (sectionKey: string) => {
    const def = SECTION_MAP.get(sectionKey);
    if (!def) return null;

    if (sectionKey === 'legal_docs' || sectionKey === 'escrow_funding') return null;

    const isLocked = LOCKED_SECTIONS.has(sectionKey);
    const canEdit = canEditSection(sectionKey);
    const isEditing = editingSection === sectionKey;

    const rendered = def.render(challenge, [], legalDetails, escrowRecord);
    const hasContent = rendered !== null;

    const sectionSources = attachments.filter((a) => a.section_key === sectionKey);

    return (
      <PreviewSection
        key={sectionKey}
        sectionKey={sectionKey}
        label={def.label}
        attribution={def.attribution}
        canEdit={canEdit}
        isLocked={isLocked}
        isEditing={isEditing}
        onStartEdit={() => handleStartEdit(sectionKey)}
        onCancelEdit={handleCancelEdit}
        editContent={
          isEditing ? (
            <PreviewSectionEditor
              sectionKey={sectionKey}
              initialValue={getSectionValue(sectionKey)}
              onSave={(val) => handleSectionSave(sectionKey, val)}
              onCancel={handleCancelEdit}
              saving={savingSection}
            />
          ) : undefined
        }
      >
        {hasContent ? rendered : (
          <p className="text-sm text-muted-foreground italic">
            {filledSections.has(sectionKey) ? 'Configured (view in curation workspace)' : 'Not defined yet.'}
          </p>
        )}
        {sectionSources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
              {sectionSources.length} accepted source{sectionSources.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-1">
              {sectionSources.map((s) => (
                <span key={s.id} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {s.display_name ?? s.url_title ?? s.file_name ?? s.source_url?.substring(0, 40) ?? 'Source'}
                </span>
              ))}
            </div>
          </div>
        )}
      </PreviewSection>
    );
  };

  return (
    <div className="max-w-[800px] mx-auto">
      {/* Hero section */}
      <div className="mb-8 pb-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground mb-2">{challenge.title}</h1>
        {challenge.hook && (
          <p className="text-sm text-muted-foreground italic">{challenge.hook}</p>
        )}
      </div>

      {/* § 0. Organization */}
      <PreviewGroupHeader id="organization" icon="🏢" label="Organization" />
      <PreviewOrgSection
        orgData={orgData}
        operatingModel={challenge.operating_model}
        solverAudience={(challenge as unknown as Record<string, unknown>).solver_audience as string | null}
        extendedBrief={extendedBrief}
        attachments={attachments}
      />

      {/* § 1-6. Standard groups */}
      {GROUPS.filter((g) => g.id !== 'organization').map((group) => (
        <div key={group.id}>
          <PreviewGroupHeader id={group.id} icon={group.icon} label={group.label.replace(/^\d+\.\s*/, '')} />
          {group.sectionKeys.map((key) => {
            if (key === 'legal_docs') {
              return (
                <PreviewSection
                  key={key}
                  sectionKey={key}
                  label="Legal Documents"
                  attribution="by LC"
                  canEdit={false}
                  isLocked
                  isEditing={false}
                  onStartEdit={() => {}}
                >
                  <PreviewLegalSection legalDetails={legalDetails} lcComplete={lcComplete} isControlled={isControlled} />
                </PreviewSection>
              );
            }
            if (key === 'escrow_funding') {
              return (
                <PreviewSection
                  key={key}
                  sectionKey={key}
                  label="Escrow & Funding"
                  attribution="by FC"
                  canEdit={false}
                  isLocked
                  isEditing={false}
                  onStartEdit={() => {}}
                >
                  <PreviewEscrowSection escrow={escrowRecord} fcComplete={fcComplete} isControlled={isControlled} />
                </PreviewSection>
              );
            }
            return renderStandardSection(key);
          })}
        </div>
      ))}

      {/* § 8. Context Digest */}
      <PreviewGroupHeader id="context_digest" icon="📚" label="Context Digest" />
      <PreviewSection
        sectionKey="context_digest"
        label="AI-Synthesized Digest"
        canEdit={canEditSection('context_digest')}
        isLocked={false}
        isEditing={editingSection === 'context_digest'}
        onStartEdit={() => handleStartEdit('context_digest')}
        onCancelEdit={handleCancelEdit}
      >
        <PreviewDigestSection digest={digest} />
      </PreviewSection>
    </div>
  );
}
