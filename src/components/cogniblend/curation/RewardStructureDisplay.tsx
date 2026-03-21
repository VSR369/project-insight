/**
 * RewardStructureDisplay — Structured card-based view of reward tiers,
 * milestone payment breakdowns, and non-monetary perks.
 */

import { parseJson } from '@/lib/cogniblend/jsonbUnwrap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Award, Trophy, Medal, Gift, Star, BadgeCheck, CreditCard, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Json } from '@/integrations/supabase/types';

/* ── Types ── */

interface PaymentMilestone {
  name: string;
  pct: number;
  trigger?: string;
}

interface RewardData {
  type?: string;
  description?: string;
  currency?: string;
  platinum?: number;
  gold?: number;
  silver?: number | null;
  num_rewarded?: string;
  payment_mode?: string;
  payment_milestones?: PaymentMilestone[];
  payment_schedule?: PaymentMilestone[];
  non_monetary_perks?: string[];
  amount?: number;
  tiers?: any[];
}

interface RewardStructureDisplayProps {
  rewardStructure: Json | null;
  currencyCode?: string;
}

/* ── Constants ── */

const TIER_CONFIG = [
  {
    key: 'platinum' as const,
    label: 'Platinum',
    icon: Trophy,
    gradient: 'from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20',
    border: 'border-amber-300 dark:border-amber-700',
    iconColor: 'text-amber-500',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  {
    key: 'gold' as const,
    label: 'Gold',
    icon: Award,
    gradient: 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20',
    border: 'border-yellow-400 dark:border-yellow-700',
    iconColor: 'text-yellow-500',
    badgeBg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  },
  {
    key: 'silver' as const,
    label: 'Silver',
    icon: Medal,
    gradient: 'from-slate-50 to-gray-50 dark:from-slate-950/30 dark:to-gray-950/20',
    border: 'border-slate-300 dark:border-slate-600',
    iconColor: 'text-slate-400',
    badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  },
];

const DEFAULT_PERKS = [
  { icon: BadgeCheck, label: 'Certificate of Recognition' },
  { icon: Star, label: 'Featured in Innovation Showcase' },
  { icon: Gift, label: '₹5,000 Gift Vouchers' },
  { icon: Landmark, label: 'Coffee with the Chief Minister' },
];

const TRIGGER_LABELS: Record<string, string> = {
  on_shortlisting: 'Shortlisting',
  on_full_submission: 'Full Submission',
  on_evaluation_complete: 'Evaluation Complete',
  on_selection: 'Selection',
  on_ip_transfer: 'IP Transfer',
};

/* ── Helpers ── */

function formatCurrency(amount: number, currency: string): string {
  const sym = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${amount.toLocaleString()}`;
}

function getTriggerLabel(trigger?: string): string {
  if (!trigger) return '—';
  return TRIGGER_LABELS[trigger] ?? trigger.replace(/_/g, ' ');
}

/* ── Sub-components ── */

function MilestoneTable({ milestones, tierAmount, currency }: {
  milestones: PaymentMilestone[];
  tierAmount: number;
  currency: string;
}) {
  return (
    <div className="relative w-full overflow-auto rounded-md border border-border/60 mt-3">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="text-xs font-semibold">Milestone</TableHead>
            <TableHead className="text-xs font-semibold text-center">Stage</TableHead>
            <TableHead className="text-xs font-semibold text-right">%</TableHead>
            <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {milestones.map((m, i) => (
            <TableRow key={i} className="text-xs">
              <TableCell className="font-medium py-2">{m.name}</TableCell>
              <TableCell className="text-center py-2">
                <Badge variant="outline" className="text-[10px] font-normal">
                  {getTriggerLabel(m.trigger)}
                </Badge>
              </TableCell>
              <TableCell className="text-right py-2 tabular-nums">{m.pct}%</TableCell>
              <TableCell className="text-right py-2 font-medium tabular-nums">
                {formatCurrency(Math.round(tierAmount * m.pct / 100), currency)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/30 font-semibold text-xs">
            <TableCell colSpan={2}>Total</TableCell>
            <TableCell className="text-right tabular-nums">
              {milestones.reduce((s, m) => s + m.pct, 0)}%
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrency(tierAmount, currency)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function NonMonetaryPerks({ perks }: { perks?: string[] }) {
  const items = perks && perks.length > 0
    ? perks.map((p) => ({ icon: Gift, label: p }))
    : DEFAULT_PERKS;

  return (
    <div className="mt-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-primary">Non-Monetary Rewards</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <li key={i} className="flex items-center gap-2.5 text-sm text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </span>
              {item.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TierCard({
  config,
  amount,
  rank,
  currency,
  milestones,
  perks,
}: {
  config: typeof TIER_CONFIG[number];
  amount: number;
  rank: string;
  currency: string;
  milestones: PaymentMilestone[];
  perks?: string[];
}) {
  const Icon = config.icon;
  return (
    <Card className={cn('border-l-4 overflow-hidden', config.border)}>
      <CardHeader className={cn('pb-3 bg-gradient-to-br', config.gradient)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-background shadow-sm', config.iconColor)}>
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-base font-bold">{config.label} Tier</CardTitle>
              <p className="text-xs text-muted-foreground">{rank} Place Award</p>
            </div>
          </div>
          <Badge className={cn('text-sm font-bold px-3 py-1', config.badgeBg)}>
            {formatCurrency(amount, currency)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-3 pb-4">
        {milestones.length > 0 ? (
          <>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Payment Milestone Breakdown
            </p>
            <MilestoneTable milestones={milestones} tierAmount={amount} currency={currency} />
          </>
        ) : (
          <p className="text-xs text-muted-foreground italic">No milestone breakdown defined.</p>
        )}
        <NonMonetaryPerks perks={perks} />
      </CardContent>
    </Card>
  );
}

/* ── Main Component ── */

export default function RewardStructureDisplay({ rewardStructure, currencyCode }: RewardStructureDisplayProps) {
  const raw = parseJson<RewardData>(rewardStructure);
  if (!raw) return <p className="text-sm text-muted-foreground">Not defined.</p>;

  // Non-monetary only
  if (raw.type === 'non_monetary') {
    return (
      <Card className="border-l-4 border-primary">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Non-Monetary Recognition</h3>
          </div>
          <p className="text-sm text-foreground">{raw.description || 'Recognition-based reward.'}</p>
          <NonMonetaryPerks perks={raw.non_monetary_perks} />
        </CardContent>
      </Card>
    );
  }

  // Lightweight monetary (single amount, no tiers)
  if (raw.type === 'monetary' && raw.amount != null && !raw.platinum) {
    const cur = raw.currency ?? currencyCode ?? 'USD';
    return (
      <Card className="border-l-4 border-amber-400">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-semibold">Award</h3>
            </div>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-sm font-bold px-3 py-1">
              {formatCurrency(raw.amount, cur)}
            </Badge>
          </div>
          <NonMonetaryPerks perks={raw.non_monetary_perks} />
        </CardContent>
      </Card>
    );
  }

  // Full tiered structure
  const currency = raw.currency ?? currencyCode ?? 'USD';
  const milestones = raw.payment_milestones ?? raw.payment_schedule ?? [];
  const numRewarded = parseInt(raw.num_rewarded ?? '3', 10);

  // Build active tiers based on num_rewarded and non-null amounts
  const activeTiers = TIER_CONFIG.filter((t) => {
    const amt = raw[t.key];
    if (amt == null || amt === 0) return false;
    if (t.key === 'platinum') return numRewarded >= 1;
    if (t.key === 'gold') return numRewarded >= 2;
    if (t.key === 'silver') return numRewarded >= 3;
    return false;
  });

  const totalPool = activeTiers.reduce((s, t) => s + (raw[t.key] ?? 0), 0);
  const ranks = ['1st', '2nd', '3rd'];

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="text-xs gap-1">
          <Trophy className="h-3 w-3" />
          Total Pool: {formatCurrency(totalPool, currency)}
        </Badge>
        <Badge variant="outline" className="text-xs gap-1">
          {numRewarded} Winner{numRewarded !== 1 ? 's' : ''}
        </Badge>
        {raw.payment_mode && (
          <Badge variant="outline" className="text-xs gap-1 capitalize">
            <Landmark className="h-3 w-3" />
            {raw.payment_mode.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 gap-4">
        {activeTiers.map((tier, idx) => (
          <TierCard
            key={tier.key}
            config={tier}
            amount={raw[tier.key] ?? 0}
            rank={ranks[idx] ?? `${idx + 1}th`}
            currency={currency}
            milestones={milestones}
            perks={raw.non_monetary_perks}
          />
        ))}
      </div>
    </div>
  );
}
