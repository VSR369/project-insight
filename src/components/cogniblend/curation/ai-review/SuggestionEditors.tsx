/**
 * SuggestionEditors — Inline editor sub-components for AI suggestions.
 * Extracted from AIReviewResultPanel.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { computeWeightedComplexityScore, deriveComplexityLevel, deriveComplexityLabel, LEVEL_COLORS } from "@/lib/cogniblend/complexityScoring";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { SECTION_FORMAT_CONFIG } from "@/lib/cogniblend/curationSectionFormats";
import { convertAITextToHTML } from "@/utils/convertAITextToHTML";
import { cn } from "@/lib/utils";

/* ── Editable Rich Text ── */

export function EditableRichText({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const htmlValue = useMemo(() => convertAITextToHTML(value), [value]);

  return (
    <RichTextEditor
      value={htmlValue}
      onChange={onChange}
      placeholder="Edit the AI suggestion..."
      className="min-h-[120px]"
    />
  );
}

/* ── Editable Line Items ── */

export function EditableLineItems({
  items,
  onChange,
}: {
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const handleItemChange = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };
  const handleAdd = () => onChange([...items, ""]);
  const handleRemove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <span className="text-xs text-muted-foreground w-5 text-right shrink-0 pt-2">{i + 1}.</span>
          <Textarea
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }
            }}
            value={item}
            onChange={(e) => handleItemChange(i, e.target.value)}
            className="text-sm min-h-[2rem] flex-1 resize-none whitespace-pre-wrap py-1.5"
            placeholder="Item text..."
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = target.scrollHeight + "px";
            }}
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive mt-0.5" onClick={() => handleRemove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
        <Plus className="h-3 w-3 mr-1" />Add Item
      </Button>
    </div>
  );
}

/* ── Editable Table Rows ── */

export function EditableTableRows({
  sectionKey,
  rows,
  onChange,
}: {
  sectionKey?: string;
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const columns = sectionKey
    ? SECTION_FORMAT_CONFIG[sectionKey]?.columns ?? null
    : null;

  const isEvalCriteria = !columns || sectionKey === 'evaluation_criteria';

  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    const isNumeric = field === 'weight' || field === 'weight_percentage';
    updated[index] = { ...updated[index], [field]: isNumeric ? Number(value) || 0 : value };
    onChange(updated);
  };

  const handleAdd = () => {
    if (isEvalCriteria) {
      onChange([...rows, { name: "", weight: 0, description: "" }]);
    } else {
      const emptyRow: Record<string, unknown> = {};
      columns!.forEach(c => { emptyRow[c] = ''; });
      onChange([...rows, emptyRow]);
    }
  };

  const handleRemove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  const formatLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (isEvalCriteria) {
    return (
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-1.5 rounded border border-border/50 p-2 bg-background/50">
            <div className="flex-1 space-y-1">
              <Input
                value={String(row.name ?? row.criterion_name ?? "")}
                onChange={(e) => handleChange(i, "name", e.target.value)}
                className="text-sm h-7"
                placeholder="Criterion name..."
              />
              <div className="flex gap-1.5">
                <Input
                  type="number"
                  value={String(row.weight ?? row.weight_percentage ?? 0)}
                  onChange={(e) => handleChange(i, "weight", e.target.value)}
                  className="text-sm h-7 w-20"
                  placeholder="Weight %"
                />
                <Input
                  value={String(row.description ?? "")}
                  onChange={(e) => handleChange(i, "description", e.target.value)}
                  className="text-sm h-7 flex-1"
                  placeholder="Description..."
                />
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive mt-0.5" onClick={() => handleRemove(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
          <Plus className="h-3 w-3 mr-1" />Add Row
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-1.5 rounded border border-border/50 p-2 bg-background/50">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-1.5">
            {columns!.map((col) => (
              <Input
                key={col}
                value={String(row[col] ?? "")}
                onChange={(e) => handleChange(i, col, e.target.value)}
                className="text-sm h-7"
                placeholder={formatLabel(col)}
              />
            ))}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive mt-0.5" onClick={() => handleRemove(i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
        <Plus className="h-3 w-3 mr-1" />Add Row
      </Button>
    </div>
  );
}

/* ── Editable Schedule Rows ── */

export function EditableScheduleRows({
  rows,
  onChange,
}: {
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
}) {
  const handleChange = (index: number, field: string, value: string) => {
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      [field]: field === "duration_days" ? (value ? parseInt(value, 10) || null : null) : (value || null),
    };
    onChange(updated);
  };
  const handleAdd = () => onChange([...rows, { phase_name: "", duration_days: null, start_date: null, end_date: null }]);
  const handleRemove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10 text-xs">#</TableHead>
              <TableHead className="min-w-[180px] text-xs">Phase / Deliverable</TableHead>
              <TableHead className="w-[120px] text-xs text-center">Duration (days)</TableHead>
              <TableHead className="w-[140px] text-xs text-center">Start Date</TableHead>
              <TableHead className="w-[140px] text-xs text-center">End Date</TableHead>
              <TableHead className="w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i} className={cn(
                "transition-colors hover:bg-accent/40",
                i % 2 !== 0 && "bg-muted/30"
              )}>
                <TableCell className="p-1.5 text-muted-foreground font-mono text-xs text-center">
                  {i + 1}
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    value={String(row.phase_name ?? row.label ?? row.name ?? "")}
                    onChange={(e) => handleChange(i, "phase_name", e.target.value)}
                    className="text-sm h-8"
                    placeholder="Phase name..."
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    type="number"
                    value={String(row.duration_days ?? "")}
                    onChange={(e) => handleChange(i, "duration_days", e.target.value)}
                    className="text-sm h-8 text-center"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    type="date"
                    value={String(row.start_date ?? "")}
                    onChange={(e) => handleChange(i, "start_date", e.target.value)}
                    className="text-sm h-8"
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Input
                    type="date"
                    value={String(row.end_date ?? "")}
                    onChange={(e) => handleChange(i, "end_date", e.target.value)}
                    className="text-sm h-8"
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleRemove(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd}>
        <Plus className="h-3 w-3 mr-1" />Add Phase
      </Button>
    </div>
  );
}

/* ── Complexity Parameter Table ── */

export function ComplexityParameterTable({
  ratings,
}: {
  ratings: Record<string, { rating: number; justification: string; evidence_sections?: string[] }>;
}) {
  const entries = Object.entries(ratings);
  if (entries.length === 0) return null;

  const n = entries.length;
  const weightedScore = entries.reduce((s, [, r]) => s + r.rating, 0) / n;
  const level = deriveComplexityLevel(weightedScore);
  const label = deriveComplexityLabel(weightedScore);
  const levelColor = LEVEL_COLORS[level] ?? "";

  function ratingColor(rating: number): string {
    if (rating <= 3) return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (rating <= 5) return "bg-blue-100 text-blue-800 border-blue-300";
    if (rating <= 7) return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-red-100 text-red-800 border-red-300";
  }

  return (
    <div className="space-y-3 border-l-4 border-l-indigo-400 rounded-r-lg">
      <div className="flex items-center gap-2 px-4 pt-3">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <span className="text-sm font-semibold text-foreground">AI Complexity Assessment</span>
        <Badge className={cn("text-[11px] px-2 py-0.5 border", levelColor)}>
          {level} — {label}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          Score: {weightedScore.toFixed(2)}/10
        </span>
      </div>

      <div className="relative w-full overflow-auto mx-4 mb-3 pr-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-[140px]">Parameter</TableHead>
              <TableHead className="text-xs w-[70px] text-center">Rating</TableHead>
              <TableHead className="text-xs">Justification</TableHead>
              <TableHead className="text-xs w-[140px]">Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([key, r]) => (
              <TableRow key={key}>
                <TableCell className="text-sm font-medium py-2">
                  {key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </TableCell>
                <TableCell className="text-center py-2">
                  <Badge className={cn("text-xs px-2 py-0.5 border tabular-nums", ratingColor(r.rating))}>
                    {r.rating}/10
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground py-2 leading-relaxed">
                  {r.justification}
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {(r.evidence_sections ?? []).map((sec) => (
                      <Badge key={sec} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground font-mono">
                        {sec}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
