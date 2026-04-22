import React from 'react';
import { ScheduleTableSectionRenderer, StructuredFieldsSectionRenderer, LegalDocsSectionRenderer } from '@/components/cogniblend/curation/renderers';
import { TableSectionEditor } from '@/components/cogniblend/curation/renderers/TableSectionEditor';
import { CreatorReferencesRenderer } from '@/components/cogniblend/curation/renderers/CreatorReferencesRenderer';
import { resolveGovernanceMode } from '@/lib/governanceMode';
import { parseJson } from '@/lib/cogniblend/curationHelpers';
import type { RenderSectionContentArgs } from '@/components/cogniblend/curation/renderSectionContent';

const OPS_KEYS = new Set(['phase_schedule', 'legal_docs', 'escrow_funding', 'data_resources_provided', 'success_metrics_kpis', 'creator_references']);

export function renderOpsSection(args: RenderSectionContentArgs, editButton: React.ReactNode): React.ReactNode | null {
  const { section, challenge, isReadOnly, savingSection, cancelEdit, setEditingSection, handleAcceptAllLegalDefaults, saveSectionMutation, legalDocs, legalDetails, autoSaveStatus, challengeId, currentUserId } = args;
  if (!OPS_KEYS.has(section.key)) return null;

  switch (section.key) {
    case 'phase_schedule':
      return <ScheduleTableSectionRenderer data={parseJson<unknown>(challenge.phase_schedule)} readOnly={isReadOnly} editing={!isReadOnly} onSave={(rows) => saveSectionMutation.mutate({ field: 'phase_schedule', value: rows })} onCancel={() => setEditingSection(null)} saving={savingSection} />;
    case 'legal_docs':
      return <LegalDocsSectionRenderer documents={legalDetails} governanceMode={resolveGovernanceMode(challenge.governance_mode_override ?? challenge.governance_profile)} onAcceptAllDefaults={handleAcceptAllLegalDefaults} isAcceptingAll={false} challengeId={challengeId} currentPhase={challenge.current_phase ?? undefined} engagementModel={challenge.operating_model ?? undefined} organizationId={challenge.organization_id} />;
    case 'escrow_funding': {
      const governanceMode = resolveGovernanceMode(challenge.governance_mode_override ?? challenge.governance_profile);
      return <StructuredFieldsSectionRenderer challengeId={challengeId} userId={currentUserId} governanceMode={governanceMode} isReadOnly={isReadOnly} />;
    }
    case 'data_resources_provided': {
      const raw = parseJson<Record<string, string>[]>(challenge.data_resources_provided ?? null) ?? [];
      if (!isReadOnly) return <TableSectionEditor columns={[{ key: 'resource', label: 'Resource' }, { key: 'type', label: 'Type' }, { key: 'format', label: 'Format' }, { key: 'size', label: 'Size' }, { key: 'access_method', label: 'Access Method' }, { key: 'restrictions', label: 'Restrictions' }]} initialRows={raw} onSave={(rows) => saveSectionMutation.mutate({ field: 'data_resources_provided', value: rows })} onCancel={cancelEdit} saving={savingSection} autoSaveStatus={autoSaveStatus} />;
      return <>{section.render(challenge, legalDocs, legalDetails, null)}{editButton}</>;
    }
    case 'success_metrics_kpis': {
      const raw = parseJson<Record<string, string>[]>(challenge.success_metrics_kpis ?? null) ?? [];
      if (!isReadOnly) return <TableSectionEditor columns={[{ key: 'kpi', label: 'KPI' }, { key: 'baseline', label: 'Baseline' }, { key: 'target', label: 'Target' }, { key: 'measurement_method', label: 'Measurement Method' }, { key: 'timeframe', label: 'Timeframe' }]} initialRows={raw} onSave={(rows) => saveSectionMutation.mutate({ field: 'success_metrics_kpis', value: rows })} onCancel={cancelEdit} saving={savingSection} autoSaveStatus={autoSaveStatus} />;
      return <>{section.render(challenge, legalDocs, legalDetails, null)}{editButton}</>;
    }
    case 'creator_references':
      return <CreatorReferencesRenderer challengeId={challengeId} isReadOnly={isReadOnly} />;
    default:
      return null;
  }
}
