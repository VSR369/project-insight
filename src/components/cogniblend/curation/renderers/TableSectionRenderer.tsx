/**
 * TableSectionRenderer — View/edit for table-format sections.
 * Used for: evaluation_criteria, legal_docs
 */

import { EvalCriteriaEditor } from "@/components/cogniblend/curation/CurationSectionEditor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CriterionRow {
  name: string;
  weight: number;
  description?: string;
}

interface TableSectionRendererProps {
  sectionKey: string;
  rows: CriterionRow[];
  readOnly: boolean;
  editing: boolean;
  onSave: (criteria: CriterionRow[]) => void;
  onCancel: () => void;
  saving?: boolean;
  /** For evaluation_criteria: shows weight total */
  showWeightTotal?: boolean;
}

export function TableSectionRenderer({
  sectionKey,
  rows,
  readOnly,
  editing,
  onSave,
  onCancel,
  saving,
  showWeightTotal = false,
}: TableSectionRendererProps) {
  if (editing && !readOnly) {
    return (
      <EvalCriteriaEditor
        criteria={rows}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
    );
  }

  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Not defined.</p>;
  }

  const totalWeight = showWeightTotal ? rows.reduce((s, r) => s + (r.weight || 0), 0) : null;

  return (
    <div className="space-y-2">
      {rows.map((c, i) => (
        <div key={i} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground flex items-center justify-between gap-2">
          <span>
            <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
            {c.name || "—"}
          </span>
          <span className="shrink-0 font-medium text-muted-foreground">{c.weight ?? "—"}%</span>
        </div>
      ))}
      {totalWeight !== null && (
        <p className={`text-xs font-medium text-right ${totalWeight === 100 ? "text-emerald-600" : "text-destructive"}`}>
          Total: {totalWeight}% {totalWeight !== 100 && "(must be 100%)"}
        </p>
      )}
    </div>
  );
}
