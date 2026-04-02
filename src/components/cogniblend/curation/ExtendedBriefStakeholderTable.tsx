/**
 * ExtendedBriefStakeholderTable — Editor and read-only view for
 * the affected_stakeholders subsection of Extended Brief.
 * Extracted from ExtendedBriefDisplay.tsx.
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface StakeholderRow {
  stakeholder_name: string;
  role: string;
  impact_description: string;
  adoption_challenge: string;
}

export function StakeholderTableEditor({
  rows,
  onSave,
  onCancel,
  saving,
}: {
  rows: StakeholderRow[];
  onSave: (rows: StakeholderRow[]) => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const [editRows, setEditRows] = useState<StakeholderRow[]>(
    rows.length > 0 ? [...rows] : [{ stakeholder_name: "", role: "", impact_description: "", adoption_challenge: "" }]
  );

  const updateRow = (idx: number, field: keyof StakeholderRow, value: string) => {
    setEditRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addRow = () => {
    setEditRows((prev) => [...prev, { stakeholder_name: "", role: "", impact_description: "", adoption_challenge: "" }]);
  };

  const removeRow = (idx: number) => {
    setEditRows((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Stakeholder</TableHead>
              <TableHead className="min-w-[100px]">Role</TableHead>
              <TableHead className="min-w-[150px]">Impact</TableHead>
              <TableHead className="min-w-[150px]">Adoption Challenge</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {editRows.map((row, i) => (
              <TableRow key={i}>
                <TableCell><Input value={row.stakeholder_name} onChange={(e) => updateRow(i, "stakeholder_name", e.target.value)} className="text-sm h-8" /></TableCell>
                <TableCell><Input value={row.role} onChange={(e) => updateRow(i, "role", e.target.value)} className="text-sm h-8" /></TableCell>
                <TableCell><Input value={row.impact_description} onChange={(e) => updateRow(i, "impact_description", e.target.value.slice(0, 100))} className="text-sm h-8" maxLength={100} /></TableCell>
                <TableCell><Input value={row.adoption_challenge} onChange={(e) => updateRow(i, "adoption_challenge", e.target.value.slice(0, 100))} className="text-sm h-8" maxLength={100} /></TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRow(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" className="text-xs" onClick={addRow}>
        <Plus className="h-3 w-3 mr-1" />Add Row
      </Button>
      <div className="flex gap-2">
        <Button size="sm" disabled={saving} onClick={() => onSave(editRows.filter((r) => r.stakeholder_name.trim()))}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

export function StakeholderTableView({ rows }: { rows: StakeholderRow[] }) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No stakeholders defined.</p>;
  }
  return (
    <div className="space-y-2">
      <Badge variant="secondary" className="text-xs font-normal">
        {rows.length} stakeholder{rows.length !== 1 ? "s" : ""} identified
      </Badge>
      <div className="relative w-full overflow-auto rounded-lg border border-border">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground/70 min-w-[140px]">Stakeholder</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground/70 min-w-[100px]">Role</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground/70 min-w-[180px]">Impact</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-foreground/70 min-w-[180px]">Adoption Challenge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <TableCell className="text-sm font-medium text-foreground">{row.stakeholder_name || "—"}</TableCell>
                <TableCell className="text-sm text-foreground/80">{row.role || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.impact_description || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.adoption_challenge || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ensureStakeholderArray(val: unknown): StakeholderRow[] {
  let arr: unknown[] | null = null;
  if (Array.isArray(val)) arr = val;
  else if (val && typeof val === "object" && Array.isArray((val as any).items)) arr = (val as any).items;
  if (!arr) return [];

  const seen = new Set<string>();
  return arr
    .map((item: any) => ({
      stakeholder_name: item?.stakeholder_name ?? item?.name ?? item?.stakeholder ?? "",
      role: item?.role ?? item?.type ?? "",
      impact_description: item?.impact_description ?? item?.impact ?? item?.description ?? "",
      adoption_challenge: item?.adoption_challenge ?? item?.challenge ?? item?.barrier ?? "",
    }))
    .filter((row) => {
      const key = row.stakeholder_name.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
