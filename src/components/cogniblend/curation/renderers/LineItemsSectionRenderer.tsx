/**
 * LineItemsSectionRenderer — View/edit for line-item sections.
 * Used for: deliverables, submission_guidelines (when structured)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { DeliverablesEditor } from "@/components/cogniblend/curation/CurationSectionEditor";
import { DeliverableCardRenderer } from "./DeliverableCardRenderer";
import { DeliverableCardEditor } from "./DeliverableCardEditor";
import { AutoSaveIndicator } from "@/components/cogniblend/curation/AutoSaveIndicator";
import type { DeliverableItem } from "@/utils/parseDeliverableItem";
import type { AutoSaveStatus } from "@/hooks/cogniblend/useAutoSaveSection";

const DEFAULT_VISIBLE = 10;

interface LineItemsSectionRendererProps {
  items: string[];
  readOnly: boolean;
  editing: boolean;
  onSave: (items: string[]) => void;
  onCancel: () => void;
  saving?: boolean;
  itemLabel?: string;
  /** When provided, renders structured deliverable cards instead of flat text */
  structuredItems?: DeliverableItem[];
  onSaveStructured?: (items: DeliverableItem[]) => void;
  badgePrefix?: string;
  hideAcceptanceCriteria?: boolean;
  autoSaveStatus?: AutoSaveStatus;
}

export function LineItemsSectionRenderer({
  items,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
  itemLabel,
  structuredItems,
  onSaveStructured,
  badgePrefix,
  hideAcceptanceCriteria,
  autoSaveStatus,
}: LineItemsSectionRendererProps) {
  const [expanded, setExpanded] = useState(false);
  const useStructured = structuredItems && structuredItems.length > 0 && onSaveStructured;

  // Edit mode
  if (editing && !readOnly) {
    if (useStructured) {
      return (
        <div className="space-y-2">
          <DeliverableCardEditor
            items={structuredItems}
            onSave={onSaveStructured}
            onCancel={onCancel}
            saving={saving}
            badgePrefix={badgePrefix}
            hideAcceptanceCriteria={hideAcceptanceCriteria}
          />
          <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <DeliverablesEditor
          items={items}
          onSave={onSave}
          onCancel={onCancel}
          saving={saving}
          itemLabel={itemLabel}
        />
        <AutoSaveIndicator status={autoSaveStatus ?? (saving ? "saving" : "idle")} />
      </div>
    );
  }

  // View mode — structured cards (filter empties)
  if (useStructured) {
    const cleaned = structuredItems.filter((item) => {
      const name = (item?.name ?? "").toString().trim();
      const desc = (item?.description ?? "").toString().trim();
      return name.length > 0 || desc.length > 0;
    });
    if (cleaned.length === 0) {
      return <p className="text-sm text-muted-foreground">None defined.</p>;
    }
    return <DeliverableCardRenderer items={cleaned} badgePrefix={badgePrefix} hideAcceptanceCriteria={hideAcceptanceCriteria} />;
  }

  // View mode — plain text fallback (filter empties)
  const cleanedItems = (items ?? []).filter(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
  if (cleanedItems.length === 0) {
    return <p className="text-sm text-muted-foreground">None defined.</p>;
  }

  return (
    <div className="space-y-2">
      {cleanedItems.map((item, i) => (
        <div key={i} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
          <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
          {item}
        </div>
      ))}
    </div>
  );
}