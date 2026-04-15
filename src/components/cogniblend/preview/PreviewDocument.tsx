/**
 * PreviewDocument — Scrollable document body rendering all groups/sections.
 * Composes SECTIONS renderers + special sections into a seamless document.
 */

import { useState, useMemo } from 'react';
import { SECTIONS, GROUPS, SECTION_MAP, LOCKED_SECTIONS } from '@/lib/cogniblend/curationSectionDefs';
import { isControlledMode, resolveGovernanceMode } from '@/lib/governanceMode';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import { PreviewGroupHeader } from './PreviewGroupHeader';
import { PreviewSection } from './PreviewSection';
import { PreviewOrgSection } from './PreviewOrgSection';
import { PreviewLegalSection } from './PreviewLegalSection';
import { PreviewEscrowSection } from './PreviewEscrowSection';
import { PreviewDigestSection } from './PreviewDigestSection';
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

  const renderStandardSection = (sectionKey: string) => {
    const def = SECTION_MAP.get(sectionKey);
    if (!def) return null;

    // Skip sections rendered as special components
    if (sectionKey === 'legal_docs' || sectionKey === 'escrow_funding') return null;

    const isLocked = LOCKED_SECTIONS.has(sectionKey);
    const canEdit = canEditSection(sectionKey);
    const isEditing = editingSection === sectionKey;

    // Some sections have null render (rendered via dedicated components in curation)
    const rendered = def.render(challenge, [], legalDetails, escrowRecord);
    const hasContent = rendered !== null;

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
      >
        {hasContent ? rendered : (
          <p className="text-sm text-muted-foreground italic">
            {filledSections.has(sectionKey) ? 'Configured (view in curation workspace)' : 'Not defined yet.'}
          </p>
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
            // Legal/escrow rendered separately
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
      >
        <PreviewDigestSection digest={digest} />
      </PreviewSection>
    </div>
  );
}
