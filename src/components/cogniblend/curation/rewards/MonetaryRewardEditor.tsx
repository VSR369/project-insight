/**
 * MonetaryRewardEditor — Complete monetary reward editing experience.
 *
 * Features:
 *  - Lump sum input mode with AI Breakup button
 *  - Prize tier cards (Platinum/Gold/Silver/Honorable Mention)
 *  - Live total validator with color-coded states
 *  - Tier ordering enforcement
 */

import { useState, useCallback, useMemo } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { MonetaryReward, PrizeTier } from '@/services/rewardStructureResolver';
import { computeTierTotal, getPoolStatus, autoBalance, type ValidationError } from '@/lib/rewardValidation';
import PrizeTierCard from './PrizeTierCard';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD', 'AUD'] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', AED: 'د.إ', SGD: 'S$', AUD: 'A$',
};

interface MonetaryRewardEditorProps {
  monetary?: MonetaryReward;
  errors: ValidationError[];
  onUpdate: (monetary: MonetaryReward) => void;
  onAIBreakup?: (amount: number, currency: string) => Promise<PrizeTier[] | null>;
  aiLoading?: boolean;
}

const DEFAULT_TIERS: PrizeTier[] = [
  { rank: 'platinum', amount: 0, count: 1, label: '1st Place' },
  { rank: 'gold', amount: 0, count: 1, label: '2nd Place' },
  { rank: 'silver', amount: 0, count: 1, label: '3rd Place' },
];

export default function MonetaryRewardEditor({
  monetary,
  errors,
  onUpdate,
  onAIBreakup,
  aiLoading = false,
}: MonetaryRewardEditorProps) {
  const [lumpSumMode, setLumpSumMode] = useState(!monetary?.tiers?.length);
  const [lumpSum, setLumpSum] = useState<string>(
    monetary?.totalPool ? String(monetary.totalPool) : '',
  );
  const [showHonorable, setShowHonorable] = useState(
    monetary?.tiers?.some((t) => t.rank === 'honorable_mention') ?? false,
  );

  const currency = monetary?.currency ?? 'USD';
  const currSym = CURRENCY_SYMBOLS[currency] ?? '$';
  const tiers = monetary?.tiers ?? [];

  const hasTiers = tiers.length > 0 && tiers.some((t) => t.amount > 0 || t.rank !== 'honorable_mention');

  // ── Helpers ──

  const updateField = useCallback(
    (patch: Partial<MonetaryReward>) => {
      onUpdate({ ...(monetary ?? { currency: 'USD', tiers: [] }), ...patch });
    },
    [monetary, onUpdate],
  );

  const updateTier = useCallback(
    (rank: PrizeTier['rank'], patch: Partial<PrizeTier>) => {
      const currentTiers = monetary?.tiers ?? [];
      const existing = currentTiers.find((t) => t.rank === rank);
      if (existing) {
        updateField({
          tiers: currentTiers.map((t) => (t.rank === rank ? { ...t, ...patch } : t)),
        });
      } else {
        updateField({
          tiers: [...currentTiers, { rank, amount: 0, count: 1, ...patch }],
        });
      }
    },
    [monetary, updateField],
  );

  const handleAIBreakup = useCallback(async () => {
    const amount = Number(lumpSum) || 0;
    if (amount <= 0) return;

    if (onAIBreakup) {
      const result = await onAIBreakup(amount, currency);
      if (result) {
        updateField({ tiers: result, totalPool: amount });
        setLumpSumMode(false);
      }
    } else {
      // Simple default breakup
      const platinum = Math.round(amount * 0.5);
      const gold = Math.round(amount * 0.3);
      const silver = amount - platinum - gold;
      updateField({
        totalPool: amount,
        tiers: [
          { rank: 'platinum', amount: platinum, count: 1, label: '1st Place' },
          { rank: 'gold', amount: gold, count: 1, label: '2nd Place' },
          { rank: 'silver', amount: silver, count: 1, label: '3rd Place' },
        ],
      });
      setLumpSumMode(false);
    }
  }, [lumpSum, currency, onAIBreakup, updateField]);

  const handleManualSetup = useCallback(() => {
    updateField({ tiers: [...DEFAULT_TIERS], totalPool: Number(lumpSum) || undefined });
    setLumpSumMode(false);
  }, [updateField, lumpSum]);

  const handleAutoBalance = useCallback(() => {
    if (!monetary?.totalPool || !monetary.tiers.length) return;
    const balanced = autoBalance(monetary.tiers, monetary.totalPool);
    updateField({ tiers: balanced });
  }, [monetary, updateField]);

  const toggleHonorable = useCallback(() => {
    if (showHonorable) {
      updateField({ tiers: (monetary?.tiers ?? []).filter((t) => t.rank !== 'honorable_mention') });
      setShowHonorable(false);
    } else {
      updateField({
        tiers: [
          ...(monetary?.tiers ?? []),
          { rank: 'honorable_mention', amount: 0, count: 3, label: 'Honorable Mention' },
        ],
      });
      setShowHonorable(true);
    }
  }, [showHonorable, monetary, updateField]);

  // ── Pool status ──
  const poolStatus = useMemo(
    () => getPoolStatus(tiers, monetary?.totalPool),
    [tiers, monetary?.totalPool],
  );

  // ── Error lookup helper ──
  const getError = (field: string) => errors.find((e) => e.field === field)?.message;

  // ── Render ──
  return (
    <div className="space-y-4">
      {/* Currency selector */}
      <div className="flex items-center gap-3">
        <label className="text-[12px] font-medium text-muted-foreground">Currency</label>
        <select
          value={currency}
          onChange={(e) => updateField({ currency: e.target.value })}
          className="border border-border rounded-lg px-3 py-2 text-[13px] font-medium text-foreground w-[80px] bg-background"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Lump Sum Input Mode */}
      {lumpSumMode && (
        <div className="space-y-3">
          <p className="text-[13px] font-medium text-foreground">
            What is the total prize pool?
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <span className="text-sm font-medium text-muted-foreground">{currSym}</span>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="e.g. 500000"
                value={lumpSum}
                onChange={(e) => setLumpSum(e.target.value)}
                className="text-base"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAIBreakup}
              disabled={aiLoading || !Number(lumpSum)}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white text-[12px] font-semibold px-4 py-2"
            >
              {aiLoading ? (
                <Loader2 className="h-[13px] w-[13px] animate-spin" />
              ) : (
                <Sparkles className="h-[13px] w-[13px]" />
              )}
              AI Breakup
            </Button>
          </div>

          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <span>— or —</span>
            <button
              type="button"
              onClick={handleManualSetup}
              className="text-primary underline cursor-pointer text-[12px]"
            >
              I want to set prizes manually
            </button>
          </div>
        </div>
      )}

      {/* Prize Tier Cards */}
      {!lumpSumMode && (
        <div>
          {(['platinum', 'gold', 'silver'] as const).map((rank) => {
            const tier = tiers.find((t) => t.rank === rank) ?? {
              rank,
              amount: 0,
              count: 1,
            };
            return (
              <PrizeTierCard
                key={rank}
                tier={tier}
                currencySymbol={currSym}
                editing
                error={getError(`${rank}.amount`)}
                onAmountChange={(amount) => updateTier(rank, { amount })}
                onCountChange={(count) => updateTier(rank, { count })}
              />
            );
          })}

          {/* Honorable Mention toggle */}
          {showHonorable && (
            <PrizeTierCard
              tier={
                tiers.find((t) => t.rank === 'honorable_mention') ?? {
                  rank: 'honorable_mention',
                  amount: 0,
                  count: 3,
                }
              }
              currencySymbol={currSym}
              editing
              onAmountChange={() => {}}
              onCountChange={(count) => updateTier('honorable_mention', { count })}
            />
          )}

          <button
            type="button"
            onClick={toggleHonorable}
            className="text-[12px] text-muted-foreground cursor-pointer mt-2 flex items-center gap-1"
          >
            {showHonorable ? (
              <><X className="h-3 w-3" /> Remove Honorable Mention</>
            ) : (
              <><Plus className="h-3 w-3" /> Add Honorable Mention</>
            )}
          </button>

          {/* Live Total Validator */}
          <div className="mt-4">
            {poolStatus.status === 'no_pool' && (
              <p className="text-[13px] font-semibold text-foreground">
                Total prize pool: {currSym}{poolStatus.computed.toLocaleString()}
              </p>
            )}
            {poolStatus.status === 'match' && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <CheckCircle className="h-[13px] w-[13px] text-green-600" />
                <span className="text-[12px] font-semibold text-green-700">
                  Matches total pool of {currSym}{monetary?.totalPool?.toLocaleString()} ✓
                </span>
              </div>
            )}
            {poolStatus.status === 'under' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-[13px] w-[13px] text-amber-600" />
                <span className="text-[12px] font-semibold text-amber-700">
                  {currSym}{poolStatus.diff.toLocaleString()} unallocated
                </span>
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  className="text-[11px] text-primary underline ml-2"
                >
                  Auto-balance
                </button>
              </div>
            )}
            {poolStatus.status === 'over' && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertCircle className="h-[13px] w-[13px] text-destructive" />
                <span className="text-[12px] font-semibold text-destructive">
                  {currSym}{poolStatus.diff.toLocaleString()} over budget
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
