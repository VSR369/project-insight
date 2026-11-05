/** Screening review building blocks: status badge, scoring panel, AI placeholder. */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bot } from 'lucide-react';
import type { EvaluationCriterion } from '@/hooks/cogniblend/useScreeningReview';

/* ─── Status Badge ───────────────────────────────────────── */

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SHORTLISTED':
    case 'APPROVED_SHORTLIST':
      return <Badge className="bg-emerald-600/15 text-emerald-700 border-emerald-300">Shortlisted</Badge>;
    case 'REJECTED':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

/* ─── Scoring Panel ──────────────────────────────────────── */

export interface ScoringPanelProps {
  criteria: EvaluationCriterion[];
  scores: Record<string, number>;
  onScoreChange: (criterion: string, score: number) => void;
  commentary: string;
  onCommentaryChange: (value: string) => void;
  isStructuredOrAbove: boolean;
  weightedTotal: number | null;
  readOnly: boolean;
}

export function ScoringPanel({
  criteria,
  scores,
  onScoreChange,
  commentary,
  onCommentaryChange,
  isStructuredOrAbove,
  weightedTotal,
  readOnly,
}: ScoringPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Evaluation Scoring</h3>

      {criteria.length === 0 ? (
        <p className="text-sm text-muted-foreground">No evaluation criteria defined for this challenge.</p>
      ) : (
        <div className="space-y-3">
          {criteria.map((c) => (
            <div key={c.criterion_name} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.criterion_name}</p>
                <p className="text-xs text-muted-foreground">{c.weight_percentage}% weight</p>
              </div>
              <Input
                type="number"
                min={1}
                max={10}
                value={scores[c.criterion_name] ?? ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 10) {
                    onScoreChange(c.criterion_name, val);
                  } else if (e.target.value === '') {
                    onScoreChange(c.criterion_name, 0);
                  }
                }}
                className="w-20 text-center"
                placeholder="1-10"
                disabled={readOnly}
              />
            </div>
          ))}

          <Separator />

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Weighted Total</p>
            <span className="text-lg font-bold text-primary">
              {weightedTotal != null ? `${weightedTotal.toFixed(2)} / 10` : '—'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Commentary {isStructuredOrAbove && <span className="text-destructive">*</span>}
        </Label>
        <Textarea
          value={commentary}
          onChange={(e) => onCommentaryChange(e.target.value)}
          placeholder={isStructuredOrAbove ? 'Required for Structured/Controlled modes (min 100 chars)...' : 'Optional commentary...'}
          rows={4}
          disabled={readOnly}
        />
        {isStructuredOrAbove && (
          <p className="text-xs text-muted-foreground">{commentary.length}/100 characters minimum</p>
        )}
      </div>
    </div>
  );
}

/* ─── AI Evaluation Placeholder ──────────────────────────── */

export function AIEvaluationPlaceholder() {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="p-6 text-center space-y-3">
        <Bot className="h-10 w-10 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium text-muted-foreground">AI Analysis</p>
        <p className="text-xs text-muted-foreground">Available in future update (M-23)</p>
      </CardContent>
    </Card>
  );
}
