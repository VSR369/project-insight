/**
 * ScheduleTableSectionRenderer — View/edit for phase_schedule data.
 * Renders phase schedule as a table with 4 columns:
 * Phase/Deliverable, Duration (days), Start Date, End Date.
 */

import { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, X } from "lucide-react";

interface PhaseRow {
  phase_name: string;
  duration_days: number | null;
  start_date: string | null;
  end_date: string | null;
}

interface ScheduleTableSectionRendererProps {
  data: any;
  readOnly: boolean;
  editing?: boolean;
  onSave?: (rows: PhaseRow[]) => void;
  onCancel?: () => void;
  saving?: boolean;
}

/** Normalize various data formats into a consistent PhaseRow[] */
function normalizeScheduleData(data: any): PhaseRow[] {
  if (!data) return [];

  // Handle array format
  if (Array.isArray(data)) {
    return data.map((p: any) => ({
      phase_name: p.phase_name ?? p.label ?? p.name ?? p.phase ?? "",
      duration_days: p.duration_days ?? p.days ?? null,
      start_date: p.start_date ?? null,
      end_date: p.end_date ?? null,
    }));
  }

  // Handle object format with phase_durations
  if (typeof data === "object" && data.phase_durations && Array.isArray(data.phase_durations)) {
    return data.phase_durations.map((p: any) => ({
      phase_name: p.phase_name ?? p.label ?? p.name ?? "",
      duration_days: p.duration_days ?? p.days ?? null,
      start_date: p.start_date ?? null,
      end_date: p.end_date ?? null,
    }));
  }

  return [];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export function ScheduleTableSectionRenderer({
  data,
  readOnly,
  editing = false,
  onSave,
  onCancel,
  saving = false,
}: ScheduleTableSectionRendererProps) {
  const rows = normalizeScheduleData(data);
  const [editRows, setEditRows] = useState<PhaseRow[]>(() => rows.length > 0 ? rows : [{ phase_name: "", duration_days: null, start_date: null, end_date: null }]);

  const handleRowChange = useCallback((index: number, field: keyof PhaseRow, value: string) => {
    setEditRows(prev => prev.map((r, i) => {
      if (i !== index) return r;
      if (field === "duration_days") {
        return { ...r, [field]: value ? parseInt(value, 10) || null : null };
      }
      return { ...r, [field]: value || null };
    }));
  }, []);

  const handleAddRow = useCallback(() => {
    setEditRows(prev => [...prev, { phase_name: "", duration_days: null, start_date: null, end_date: null }]);
  }, []);

  const handleRemoveRow = useCallback((index: number) => {
    setEditRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ── Edit mode ──
  if (editing && !readOnly && onSave && onCancel) {
    return (
      <div className="space-y-3">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Phase / Deliverable</TableHead>
                <TableHead className="w-[120px] text-right">Duration (days)</TableHead>
                <TableHead className="w-[150px]">Start Date</TableHead>
                <TableHead className="w-[150px]">End Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {editRows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Input
                      value={row.phase_name}
                      onChange={e => handleRowChange(i, "phase_name", e.target.value)}
                      placeholder="Phase name..."
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.duration_days ?? ""}
                      onChange={e => handleRowChange(i, "duration_days", e.target.value)}
                      placeholder="0"
                      className="text-sm text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.start_date ?? ""}
                      onChange={e => handleRowChange(i, "start_date", e.target.value)}
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={row.end_date ?? ""}
                      onChange={e => handleRowChange(i, "end_date", e.target.value)}
                      className="text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveRow(i)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddRow}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Phase
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1" />Cancel
            </Button>
            <Button size="sm" onClick={() => onSave(editRows.filter(r => r.phase_name.trim()))} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── View mode ──
  if (!rows || rows.length === 0) {
    // Check for meta-only format (e.g., {expected_timeline: "3-6"})
    if (data && typeof data === "object" && !Array.isArray(data)) {
      const { phase_durations, ...meta } = data as Record<string, any>;
      const metaEntries = Object.entries(meta).filter(([, v]) => v != null && v !== "");
      if (metaEntries.length > 0) {
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {metaEntries.map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
                <p className="text-sm font-medium text-foreground">{String(v)}</p>
              </div>
            ))}
          </div>
        );
      }
    }
    return <p className="text-sm text-muted-foreground">Not defined.</p>;
  }

  return (
    <div className="relative w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Phase / Deliverable</TableHead>
            <TableHead className="text-right">Duration (days)</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i}>
              <TableCell className="text-sm font-medium">{row.phase_name || "—"}</TableCell>
              <TableCell className="text-sm text-right">{row.duration_days ?? "—"}</TableCell>
              <TableCell className="text-sm">{formatDate(row.start_date)}</TableCell>
              <TableCell className="text-sm">{formatDate(row.end_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
