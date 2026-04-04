/**
 * AIReviewFieldCard — Individual field review card in AI Review drawer.
 * Shows score badge (green/amber/red), AI comment, and optional checkbox (CONTROLLED).
 */

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface AIReviewFieldCardProps {
  fieldKey: string;
  label: string;
  score: number;
  comment: string;
  showCheckbox: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function scoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function scoreIcon(score: number): string {
  if (score >= 80) return '✅';
  if (score >= 60) return '⚠️';
  return '❌';
}

export function AIReviewFieldCard({
  label,
  score,
  comment,
  showCheckbox,
  checked,
  onCheckedChange,
}: AIReviewFieldCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      {showCheckbox && (
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-1"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{scoreIcon(score)}</span>
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded border', scoreBadgeClass(score))}>
            {score}/100
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{comment}</p>
      </div>
    </div>
  );
}
