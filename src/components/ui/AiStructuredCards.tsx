/**
 * AiStructuredCards — Rich card renderers for structured JSON AI responses.
 *
 * Routes parsed JSON to the appropriate visual card:
 * - MonetaryCard: reward tiers, milestones, tiered perks
 * - EvaluationCard: scores, criteria breakdowns, recommendations
 * - TableCard: array-of-objects rendered as a data table
 * - GenericCard: key-value fallback for unknown shapes
 */

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/* ────────────────────────────────────────────────────────── */
/*  StructuredRenderer — Router                              */
/* ────────────────────────────────────────────────────────── */

interface StructuredRendererProps {
  data: Record<string, unknown> | Record<string, unknown>[];
  className?: string;
}

export function StructuredRenderer({ data, className }: StructuredRendererProps) {
  // Array of objects → table
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    return <TableCard rows={data as Record<string, unknown>[]} className={className} />;
  }

  const obj = data as Record<string, unknown>;
  const type = (obj.type as string) || '';

  // Monetary / reward / prize
  if (
    type === 'monetary' ||
    obj.reward_distribution ||
    obj.prize_pool ||
    obj.milestones
  ) {
    return <MonetaryCard data={obj} className={className} />;
  }

  // Evaluation / scoring / feedback
  if (
    type === 'evaluation' ||
    type === 'feedback' ||
    obj.scores ||
    obj.criteria ||
    obj.overall_score !== undefined
  ) {
    return <EvaluationCard data={obj} className={className} />;
  }

  // Fallback: generic key-value
  return <GenericCard data={obj} className={className} />;
}

/* ────────────────────────────────────────────────────────── */
/*  SectionLabel — Shared heading helper                     */
/* ────────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  MonetaryCard                                             */
/* ────────────────────────────────────────────────────────── */

interface Milestone {
  name: string;
  percentage: number;
}

const TIER_STYLES: Record<string, { card: string; badge: string; amount: string }> = {
  platinum: {
    card: 'border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/30',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
    amount: 'text-purple-700 dark:text-purple-300',
  },
  gold: {
    card: 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    amount: 'text-amber-700 dark:text-amber-300',
  },
  silver: {
    card: 'border-muted bg-muted/30',
    badge: 'bg-muted text-muted-foreground',
    amount: 'text-muted-foreground',
  },
};

function MonetaryCard({
  data,
  className,
}: {
  data: Record<string, unknown>;
  className?: string;
}) {
  const milestones = (data.milestones as Milestone[]) || [];
  const dist = data.reward_distribution as Record<string, unknown> | undefined;
  const perks = data.tiered_perks as Record<string, string[]> | undefined;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 space-y-1', className)}>
      {/* Type pill */}
      <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
        Monetary Reward
      </span>

      {/* Description */}
      {data.description && (
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          {data.description as string}
        </p>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <>
          <SectionLabel>Payment Milestones</SectionLabel>
          <div className="space-y-2">
            {milestones.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-sm"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1 text-foreground">{m.name}</span>
                <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(m.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                  {m.percentage}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tier cards */}
      {dist && (
        <>
          <SectionLabel>Reward Tiers</SectionLabel>
          <div className="grid gap-3 lg:grid-cols-3">
            {Object.entries(dist).map(([tier, amount]) => {
              const styles =
                TIER_STYLES[tier.toLowerCase()] || TIER_STYLES.silver;
              const tierPerks =
                perks?.[tier.toLowerCase()] || [];
              return (
                <div
                  key={tier}
                  className={cn(
                    'rounded-lg border p-4 space-y-2',
                    styles.card,
                  )}
                >
                  <span
                    className={cn(
                      'inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                      styles.badge,
                    )}
                  >
                    {tier}
                  </span>
                  <p className={cn('text-xl font-bold', styles.amount)}>
                    {String(amount)}
                  </p>
                  {tierPerks.length > 0 && (
                    <ul className="space-y-1">
                      {tierPerks.map((perk, pi) => (
                        <li
                          key={pi}
                          className="flex items-start gap-1.5 text-xs text-muted-foreground"
                        >
                          <span className="text-primary mt-px">✓</span>
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  EvaluationCard                                           */
/* ────────────────────────────────────────────────────────── */

interface CriterionItem {
  name: string;
  score: number;
  max: number;
  comment?: string;
}

function scoreColor(pct: number) {
  if (pct >= 75) return { bar: 'bg-green-500', text: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/30' };
  if (pct >= 50) return { bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' };
  return { bar: 'bg-destructive', text: 'text-destructive', bg: 'bg-destructive/5' };
}

function EvaluationCard({
  data,
  className,
}: {
  data: Record<string, unknown>;
  className?: string;
}) {
  const rawScore = data.overall_score;
  const score = typeof rawScore === 'number' ? rawScore : undefined;
  const rawMax = data.max_score;
  const maxScore = typeof rawMax === 'number' && rawMax > 0 ? rawMax : 100;
  const criteria = data.criteria as CriterionItem[] | undefined;
  const feedback = data.feedback as string | undefined;
  const recommendation = data.recommendation as string | undefined;

  const pct = score !== undefined ? Math.min(100, Math.max(0, Math.round((score / maxScore) * 100))) : null;
  const colors = pct !== null ? scoreColor(pct) : { bar: 'bg-primary', text: 'text-primary', bg: 'bg-primary/5' };

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 space-y-1', className)}>
      <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
        Evaluation
      </span>

      {/* Overall score */}
      {score !== undefined && (
        <div className={cn('flex items-center gap-4 rounded-lg p-4 mt-3', colors.bg)}>
          <p className={cn('text-4xl font-extrabold tabular-nums', colors.text)}>
            {score}
          </p>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground">out of {maxScore}</p>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', colors.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          {data.grade && (
            <span className={cn('text-lg font-bold', colors.text)}>
              {data.grade as string}
            </span>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          {feedback}
        </p>
      )}

      {/* Criteria breakdown */}
      {criteria && criteria.length > 0 && (
        <>
          <SectionLabel>Criteria Breakdown</SectionLabel>
          <div className="space-y-3">
            {criteria.map((c, i) => {
              const cScore = typeof c.score === 'number' ? c.score : 0;
              const cMax = typeof c.max === 'number' && c.max > 0 ? c.max : 100;
              const cpct = Math.min(100, Math.max(0, Math.round((cScore / cMax) * 100)));
              const cc = scoreColor(cpct);
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <span className={cn('text-xs font-semibold', cc.text)}>
                      {cScore}/{cMax}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', cc.bar)}
                      style={{ width: `${cpct}%` }}
                    />
                  </div>
                  {c.comment && (
                    <p className="text-xs text-muted-foreground">{c.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <strong className="text-primary">Recommendation:</strong> {recommendation}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  TableCard                                                */
/* ────────────────────────────────────────────────────────── */

function TableCard({
  rows,
  className,
}: {
  rows: Record<string, unknown>[];
  className?: string;
}) {
  const headers = Object.keys(rows[0]);

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}>
      <div className="relative w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {headers.map((h) => (
                <TableHead
                  key={h}
                  className="font-semibold text-foreground text-xs uppercase tracking-wide"
                >
                  {h.replace(/_/g, ' ')}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={i}
                className={cn(i % 2 === 1 && 'bg-muted/30')}
              >
                {headers.map((h) => (
                  <TableCell key={h} className="text-sm py-2.5">
                    {String(row[h] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  GenericCard — Key-value fallback                         */
/* ────────────────────────────────────────────────────────── */

function GenericCard({
  data,
  className,
}: {
  data: Record<string, unknown>;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card divide-y divide-border', className)}>
      {Object.entries(data).map(([key, val]) => (
        <div key={key} className="flex flex-col lg:flex-row lg:items-start gap-1 lg:gap-4 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:w-40 shrink-0">
            {key.replace(/_/g, ' ')}
          </span>
          <span className="text-sm text-foreground break-words">
            {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}
