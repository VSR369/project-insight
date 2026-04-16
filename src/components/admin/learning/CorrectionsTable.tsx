/**
 * CorrectionsTable — Displays curator correction records with filters.
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CuratorCorrectionRow } from '@/hooks/queries/useCuratorCorrections';

interface CorrectionsTableProps {
  corrections: CuratorCorrectionRow[];
  filterAction: string;
  filterSection: string;
  onFilterAction: (v: string) => void;
  onFilterSection: (v: string) => void;
}

const ACTION_BADGES: Record<string, { label: string; className: string }> = {
  accepted_unchanged: { label: 'Accepted', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  accepted_with_edits: { label: 'Edited', className: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  rejected_rewritten: { label: 'Rewritten', className: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  skipped: { label: 'Skipped', className: 'bg-muted text-muted-foreground' },
};

export function CorrectionsTable({
  corrections,
  filterAction,
  filterSection,
  onFilterAction,
  onFilterSection,
}: CorrectionsTableProps) {
  const uniqueSections = [...new Set(corrections.map((c) => c.section_key))].sort();

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterAction} onValueChange={onFilterAction}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="accepted_unchanged">Accepted</SelectItem>
            <SelectItem value="accepted_with_edits">Edited</SelectItem>
            <SelectItem value="rejected_rewritten">Rewritten</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSection} onValueChange={onFilterSection}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sections</SelectItem>
            {uniqueSections.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{corrections.length} records</Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="relative w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">Section</th>
                  <th className="pb-2 font-medium text-muted-foreground">Action</th>
                  <th className="pb-2 font-medium text-muted-foreground">Edit %</th>
                  <th className="pb-2 font-medium text-muted-foreground">Time (s)</th>
                  <th className="pb-2 font-medium text-muted-foreground">Confidence</th>
                  <th className="pb-2 font-medium text-muted-foreground">Embedded</th>
                  <th className="pb-2 font-medium text-muted-foreground">Pattern</th>
                  <th className="pb-2 font-medium text-muted-foreground">Challenge</th>
                  <th className="pb-2 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map((c) => {
                  const badge = ACTION_BADGES[c.curator_action] ?? { label: c.curator_action, className: '' };
                  return (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-2 text-xs">{c.section_key.replace(/_/g, ' ')}</td>
                      <td className="py-2">
                        <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                      </td>
                      <td className="py-2 font-mono text-xs">{c.edit_distance_percent}%</td>
                      <td className="py-2 font-mono text-xs">{Math.round(c.time_spent_seconds)}</td>
                      <td className="py-2 font-mono text-xs">{c.confidence_score ?? '—'}</td>
                      <td className="py-2">
                        {c.embedding ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-2">
                        {c.pattern_extracted ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </td>
                      <td className="py-2 font-mono text-xs">{c.challenge_id.slice(0, 8)}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {corrections.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      No corrections recorded yet. Corrections are captured when curators accept or edit AI suggestions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
