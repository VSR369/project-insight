/**
 * renderOpsSections — Operations/governance section renderers.
 * Handles: phase_schedule, legal_docs, escrow_funding,
 *          data_resources_provided, success_metrics_kpis, creator_references
 */

import React from "react";
import {
  ScheduleTableSectionRenderer,
  StructuredFieldsSectionRenderer,
  LegalDocsSectionRenderer,
} from "@/components/cogniblend/curation/renderers";
import { TableSectionEditor } from "@/components/cogniblend/curation/renderers/TableSectionEditor";
import { CreatorReferencesRenderer } from "@/components/cogniblend/curation/renderers/CreatorReferencesRenderer";
import { resolveGovernanceMode, isControlledMode } from "@/lib/governanceMode";
import { parseJson } from "@/lib/cogniblend/curationHelpers";
import type { RenderSectionContentArgs } from "@/components/cogniblend/curation/renderSectionContent";

const OPS_KEYS = new Set([
  "phase_schedule", "legal_docs", "escrow_funding",
  "data_resources_provided", "success_metrics_kpis", "creator_references",
]);

export function renderOpsSection(args: RenderSectionContentArgs, editButton: React.ReactNode): React.ReactNode | null {
  const {
    section, challenge, isReadOnly, isEditing, savingSection,
    setSavingSection, cancelEdit, setEditingSection,
    handleAcceptAllLegalDefaults, saveSectionMutation,
    escrowEnabled, setEscrowEnabled, isAcceptingAllLegal,
    legalDocs, legalDetails, escrowRecord, autoSaveStatus,
  } = args;

  if (!OPS_KEYS.has(section.key)) return null;

  switch (section.key) {
    case "phase_schedule":
      return (
        <ScheduleTableSectionRenderer
          data={parseJson<unknown>(challenge.phase_schedule)}
          readOnly={isReadOnly}
          editing={isEditing}
          onSave={(rows) => {
            saveSectionMutation.mutate({ field: "phase_schedule", value: rows });
            if (Array.isArray(rows) && rows.length > 0) {
              const endDates = rows
                .map((r: any) => r.end_date)
                .filter(Boolean)
                .map((d: string) => new Date(d).getTime())
                .filter((t: number) => !isNaN(t));
              if (endDates.length > 0) {
                const maxEnd = new Date(Math.max(...endDates)).toISOString().split("T")[0];
                saveSectionMutation.mutate({ field: "submission_deadline", value: maxEnd });
              }
            }
          }}
          onCancel={() => setEditingSection(null)}
          saving={savingSection}
        />
      );

    case "legal_docs":
      return (
        <LegalDocsSectionRenderer
          documents={legalDetails}
          governanceMode={resolveGovernanceMode(challenge.governance_profile)}
          onAcceptAllDefaults={handleAcceptAllLegalDefaults}
          isAcceptingAll={isAcceptingAllLegal}
          challengeId={args.challengeId}
          currentPhase={(challenge as unknown as Record<string, unknown>).current_phase as number | undefined}
          engagementModel={(challenge as unknown as Record<string, unknown>).operating_model as string | undefined}
          organizationId={(challenge as unknown as Record<string, unknown>).organization_id as string | undefined}
        />
      );

    case "escrow_funding": {
      const gMode = resolveGovernanceMode(challenge.governance_profile);
      return (
        <StructuredFieldsSectionRenderer
          escrow={escrowRecord}
          isControlledMode={isControlledMode(gMode)}
          governanceMode={gMode}
          escrowEnabled={escrowEnabled}
          onEscrowToggle={setEscrowEnabled}
        />
      );
    }

    case "data_resources_provided": {
      const raw = parseJson<Record<string, string>[]>((challenge as any).data_resources_provided) ?? [];
      if (!isReadOnly) {
        return (
          <TableSectionEditor
            columns={[
              { key: "resource", label: "Resource" },
              { key: "type", label: "Type" },
              { key: "format", label: "Format" },
              { key: "size", label: "Size" },
              { key: "access_method", label: "Access Method" },
              { key: "restrictions", label: "Restrictions" },
            ]}
            initialRows={raw}
            onSave={(rows) => saveSectionMutation.mutate({ field: "data_resources_provided", value: rows })}
            onCancel={cancelEdit}
            saving={savingSection}
          />
        );
      }
      return (
        <>
          {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
        </>
      );
    }

    case "success_metrics_kpis": {
      const raw = parseJson<Record<string, string>[]>((challenge as any).success_metrics_kpis) ?? [];
      if (!isReadOnly) {
        return (
          <TableSectionEditor
            columns={[
              { key: "kpi", label: "KPI" },
              { key: "baseline", label: "Baseline" },
              { key: "target", label: "Target" },
              { key: "measurement_method", label: "Measurement Method" },
              { key: "timeframe", label: "Timeframe" },
            ]}
            initialRows={raw}
            onSave={(rows) => saveSectionMutation.mutate({ field: "success_metrics_kpis", value: rows })}
            onCancel={cancelEdit}
            saving={savingSection}
          />
        );
      }
      return (
        <>
          {section.render(challenge, legalDocs, legalDetails, escrowRecord)}
        </>
      );
    }

    case "creator_references":
      return <CreatorReferencesRenderer challengeId={args.challengeId} isReadOnly={isReadOnly} />;

    default:
      return null;
  }
}
