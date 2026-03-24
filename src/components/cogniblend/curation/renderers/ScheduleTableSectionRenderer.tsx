/**
 * ScheduleTableSectionRenderer — View for phase_schedule data.
 * Renders phase schedule as a table with phase, name, and duration columns.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ScheduleTableSectionRendererProps {
  data: any;
  readOnly: boolean;
}

export function ScheduleTableSectionRenderer({ data, readOnly }: ScheduleTableSectionRendererProps) {
  if (!data) return <p className="text-sm text-muted-foreground">Not defined.</p>;

  // Handle array format
  if (Array.isArray(data)) {
    if (data.length === 0) return <p className="text-sm text-muted-foreground">Not defined.</p>;
    return (
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phase</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Duration (days)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p: any, i: number) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{p.phase ?? p.phase_number ?? i + 1}</TableCell>
                <TableCell className="text-sm">{p.label ?? p.name ?? "—"}</TableCell>
                <TableCell className="text-sm text-right">{p.duration_days ?? p.days ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Handle object format with phase_durations
  const { phase_durations, ...meta } = data as Record<string, any>;
  const durations = Array.isArray(phase_durations) ? phase_durations : null;
  const metaEntries = Object.entries(meta).filter(([, v]) => v != null && v !== "");

  if (!durations?.length && metaEntries.length === 0) {
    return <p className="text-sm text-muted-foreground">Not defined.</p>;
  }

  return (
    <div className="space-y-3">
      {metaEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {metaEntries.map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
              <p className="text-sm font-medium text-foreground">{String(v)}</p>
            </div>
          ))}
        </div>
      )}
      {durations && durations.length > 0 && (
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phase</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Duration (days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {durations.map((p: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{p.phase ?? p.phase_number ?? i + 1}</TableCell>
                  <TableCell className="text-sm">{p.label ?? p.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-right">{p.duration_days ?? p.days ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
