/**
 * RewardStructureDisplay — Curator-facing reward editor.
 *
 * Features:
 * - Toggle between Monetary / Non-Monetary reward type
 * - Monetary: Single consolidated table with Platinum/Gold/Silver tier columns
 * - Total reward input when creator hasn't set amounts; AI suggests tier breakup
 * - Milestone payment breakdown rows within the same table
 * - Non-Monetary: Tier-differentiated perks table (Platinum gets more than Gold/Silver)
 * - Persists all changes to challenges.reward_structure JSONB
 */

import { useState, useCallback, useMemo } from 'react';
import { parseJson } from '@/lib/cogniblend/jsonbUnwrap';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Award, Trophy, Medal, Gift, Star, BadgeCheck, Landmark,
  CreditCard, Sparkles, Plus, X, Loader2, Pencil, Save, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Json } from '@/integrations/supabase/types';

/* ── Types ── */

interface PaymentMilestone {
  name: string;
  pct: number;
  trigger?: string;
}

interface TieredPerks {
  platinum: string[];
  gold: string[];
  silver: string[];
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
  tiered_perks?: TieredPerks;
  amount?: number;
  tiers?: any[];
}

interface RewardStructureDisplayProps {
  rewardStructure: Json | null;
  currencyCode?: string;
  challengeId: string;
  problemStatement?: string | null;
}

/* ── Constants ── */

const TRIGGER_LABELS: Record<string, string> = {
  on_shortlisting: 'Shortlisting',
  on_full_submission: 'Full Submission',
  on_evaluation_complete: 'Evaluation Complete',
  on_selection: 'Selection',
  on_ip_transfer: 'IP Transfer',
};

const DEFAULT_MILESTONES: PaymentMilestone[] = [
  { name: 'Abstract Shortlisted', pct: 10, trigger: 'on_shortlisting' },
  { name: 'Full Solution Submitted', pct: 30, trigger: 'on_full_submission' },
  { name: 'Solution Selected', pct: 60, trigger: 'on_selection' },
];

const DEFAULT_TIERED_PERKS: TieredPerks = {
  platinum: [
    'Certificate of Excellence',
    'Featured in Innovation Showcase',
    '₹10,000 Gift Vouchers',
    'Coffee with the Chief Minister',
  ],
  gold: [
    'Certificate of Merit',
    'Featured in Innovation Showcase',
    '₹5,000 Gift Vouchers',
  ],
  silver: [
    'Certificate of Recognition',
    '₹2,000 Gift Vouchers',
  ],
};

const TIER_KEYS = ['platinum', 'gold', 'silver'] as const;
type TierKey = typeof TIER_KEYS[number];

const TIER_META: Record<TierKey, { label: string; icon: typeof Trophy; iconClass: string }> = {
  platinum: { label: 'Platinum', icon: Trophy, iconClass: 'text-amber-500' },
  gold: { label: 'Gold', icon: Award, iconClass: 'text-yellow-500' },
  silver: { label: 'Silver', icon: Medal, iconClass: 'text-slate-400' },
};

const PERK_ICONS = [BadgeCheck, Star, Gift, Landmark, Award, Trophy];

/* ── Helpers ── */

function fmt(amount: number, currency: string): string {
  const sym = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  return `${sym}${amount.toLocaleString()}`;
}

function triggerLabel(trigger?: string): string {
  if (!trigger) return '—';
  return TRIGGER_LABELS[trigger] ?? trigger.replace(/_/g, ' ');
}

function defaultBreakup(total: number): { platinum: number; gold: number; silver: number } {
  return {
    platinum: Math.round(total * 0.5),
    gold: Math.round(total * 0.3),
    silver: Math.round(total * 0.2),
  };
}

/** Migrate legacy flat perks array to tiered structure */
function migrateFlatPerks(flat: string[]): TieredPerks {
  return {
    platinum: [...flat],
    gold: flat.slice(0, Math.max(flat.length - 1, 1)),
    silver: flat.slice(0, Math.max(flat.length - 2, 1)),
  };
}

/* ── Main Component ── */

export default function RewardStructureDisplay({
  rewardStructure,
  currencyCode,
  challengeId,
}: RewardStructureDisplayProps) {
  const queryClient = useQueryClient();
  const raw = useMemo(() => parseJson<RewardData>(rewardStructure), [rewardStructure]);

  // ══════════════════════════════════════
  // SECTION 1: State
  // ══════════════════════════════════════
  const existingType = raw?.type === 'non_monetary' ? 'non_monetary' : 'monetary';
  const [rewardType, setRewardType] = useState<'monetary' | 'non_monetary'>(existingType);

  const hasCreatorAmounts = (raw?.platinum != null && raw.platinum > 0) || (raw?.amount != null && raw.amount > 0);
  const currency = raw?.currency ?? currencyCode ?? 'USD';

  const [totalAmount, setTotalAmount] = useState<string>(
    hasCreatorAmounts
      ? String((raw?.platinum ?? 0) + (raw?.gold ?? 0) + (raw?.silver ?? 0) || raw?.amount || 0)
      : '',
  );
  const [platinum, setPlatinum] = useState<string>(String(raw?.platinum ?? 0));
  const [gold, setGold] = useState<string>(String(raw?.gold ?? 0));
  const [silver, setSilver] = useState<string>(String(raw?.silver ?? 0));
  const [editingTiers, setEditingTiers] = useState(false);

  const milestones = raw?.payment_milestones ?? raw?.payment_schedule ?? DEFAULT_MILESTONES;

  // Tiered non-monetary perks
  const initPerks = (): TieredPerks => {
    if (raw?.tiered_perks) return raw.tiered_perks;
    if (raw?.non_monetary_perks && raw.non_monetary_perks.length > 0) return migrateFlatPerks(raw.non_monetary_perks);
    return { ...DEFAULT_TIERED_PERKS };
  };
  const [tieredPerks, setTieredPerks] = useState<TieredPerks>(initPerks);
  const [newPerkInputs, setNewPerkInputs] = useState<Record<TierKey, string>>({ platinum: '', gold: '', silver: '' });
  const [description, setDescription] = useState(raw?.description ?? '');

  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // ══════════════════════════════════════
  // SECTION 2: Computed
  // ══════════════════════════════════════
  const platinumNum = Number(platinum) || 0;
  const goldNum = Number(gold) || 0;
  const silverNum = Number(silver) || 0;
  const totalPool = platinumNum + goldNum + silverNum;
  const totalAmountNum = Number(totalAmount) || 0;

  // Max perks across tiers for table row count
  const maxPerks = Math.max(tieredPerks.platinum.length, tieredPerks.gold.length, tieredPerks.silver.length, 1);

  // ══════════════════════════════════════
  // SECTION 3: Handlers
  // ══════════════════════════════════════
  const handleAIBreakup = useCallback(() => {
    if (!totalAmountNum || totalAmountNum <= 0) {
      toast.error('Enter a valid total reward amount first.');
      return;
    }
    setAiLoading(true);
    const breakup = defaultBreakup(totalAmountNum);
    setTimeout(() => {
      setPlatinum(String(breakup.platinum));
      setGold(String(breakup.gold));
      setSilver(String(breakup.silver));
      setEditingTiers(true);
      setAiLoading(false);
      toast.success('AI suggested tier breakup applied. You can adjust the values.');
    }, 600);
  }, [totalAmountNum]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const rewardData: Record<string, any> = rewardType === 'monetary'
        ? {
            type: 'monetary',
            currency,
            platinum: platinumNum,
            gold: goldNum,
            silver: silverNum,
            num_rewarded: silverNum > 0 ? '3' : goldNum > 0 ? '2' : '1',
            payment_mode: raw?.payment_mode ?? 'escrow',
            payment_milestones: milestones,
            tiered_perks: tieredPerks,
          }
        : {
            type: 'non_monetary',
            description,
            tiered_perks: tieredPerks,
          };

      const { error } = await supabase
        .from('challenges')
        .update({ reward_structure: rewardData as unknown as Json })
        .eq('id', challengeId);

      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      toast.success('Reward structure saved successfully');
      setEditingTiers(false);
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [rewardType, currency, platinumNum, goldNum, silverNum, milestones, tieredPerks, description, raw?.payment_mode, challengeId, queryClient]);

  const addPerk = useCallback((tier: TierKey) => {
    const trimmed = newPerkInputs[tier].trim();
    if (!trimmed) return;
    if (tieredPerks[tier].includes(trimmed)) { toast.error('Perk already exists in this tier.'); return; }
    setTieredPerks((prev) => ({ ...prev, [tier]: [...prev[tier], trimmed] }));
    setNewPerkInputs((prev) => ({ ...prev, [tier]: '' }));
  }, [newPerkInputs, tieredPerks]);

  const removePerk = useCallback((tier: TierKey, idx: number) => {
    setTieredPerks((prev) => ({ ...prev, [tier]: prev[tier].filter((_, i) => i !== idx) }));
  }, []);

  // ══════════════════════════════════════
  // SECTION 4: Render
  // ══════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* ── Type Toggle ── */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={rewardType === 'monetary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRewardType('monetary')}
          className="gap-1.5"
        >
          <CreditCard className="h-3.5 w-3.5" />
          Monetary
        </Button>
        <Button
          type="button"
          variant={rewardType === 'non_monetary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRewardType('non_monetary')}
          className="gap-1.5"
        >
          <Award className="h-3.5 w-3.5" />
          Non-Monetary
        </Button>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MONETARY SECTION                      */}
      {/* ══════════════════════════════════════ */}
      {rewardType === 'monetary' && (
        <div className="space-y-4">
          {/* Total Amount Input (when creator hasn't provided amounts) */}
          {!hasCreatorAmounts && !editingTiers && (
            <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Creator has not defined reward amounts. Enter total reward pool:
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                    <span className="text-sm font-medium text-muted-foreground">{currency}</span>
                    <Input
                      type="number"
                      placeholder="e.g. 500000"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="text-base"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAIBreakup}
                    disabled={aiLoading || !totalAmountNum}
                    className="gap-1.5"
                  >
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    AI Breakup
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary badges */}
          {(hasCreatorAmounts || editingTiers) && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs gap-1">
                <Trophy className="h-3 w-3" />
                Total Pool: {fmt(totalPool, currency)}
              </Badge>
              {raw?.payment_mode && (
                <Badge variant="outline" className="text-xs gap-1 capitalize">
                  <Landmark className="h-3 w-3" />
                  {(raw.payment_mode).replace(/_/g, ' ')}
                </Badge>
              )}
              {!editingTiers && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setEditingTiers(true)}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
            </div>
          )}

          {/* ── Consolidated Tier Table ── */}
          {(hasCreatorAmounts || editingTiers) && (
            <div className="relative w-full overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold w-[200px]">Item</TableHead>
                    {TIER_KEYS.map((tk) => {
                      const meta = TIER_META[tk];
                      const Icon = meta.icon;
                      return (
                        <TableHead key={tk} className="text-xs font-semibold text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Icon className={cn('h-3.5 w-3.5', meta.iconClass)} />
                            <span>{meta.label}</span>
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Tier Award Row */}
                  <TableRow className="bg-primary/5 font-semibold">
                    <TableCell className="text-xs font-bold py-2.5">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                        Total Award
                      </div>
                    </TableCell>
                    {editingTiers ? (
                      <>
                        <TableCell className="text-center py-1.5">
                          <Input type="number" value={platinum} onChange={(e) => setPlatinum(e.target.value)}
                            className="h-8 text-xs text-center max-w-[120px] mx-auto" />
                        </TableCell>
                        <TableCell className="text-center py-1.5">
                          <Input type="number" value={gold} onChange={(e) => setGold(e.target.value)}
                            className="h-8 text-xs text-center max-w-[120px] mx-auto" />
                        </TableCell>
                        <TableCell className="text-center py-1.5">
                          <Input type="number" value={silver} onChange={(e) => setSilver(e.target.value)}
                            className="h-8 text-xs text-center max-w-[120px] mx-auto" />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-center text-sm font-bold tabular-nums py-2.5">{fmt(platinumNum, currency)}</TableCell>
                        <TableCell className="text-center text-sm font-bold tabular-nums py-2.5">{fmt(goldNum, currency)}</TableCell>
                        <TableCell className="text-center text-sm font-bold tabular-nums py-2.5">{fmt(silverNum, currency)}</TableCell>
                      </>
                    )}
                  </TableRow>

                  {/* Milestone separator */}
                  <TableRow>
                    <TableCell colSpan={4} className="py-1 bg-muted/30">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Payment Milestone Breakdown
                      </p>
                    </TableCell>
                  </TableRow>

                  {/* Milestone Rows */}
                  {milestones.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{m.name}</span>
                          <Badge variant="outline" className="text-[9px] font-normal px-1.5 py-0">
                            {triggerLabel(m.trigger)}
                          </Badge>
                        </div>
                      </TableCell>
                      {[platinumNum, goldNum, silverNum].map((tierAmt, ti) => (
                        <TableCell key={ti} className="text-center text-xs tabular-nums py-2">
                          <span className="font-medium">{fmt(Math.round(tierAmt * m.pct / 100), currency)}</span>
                          <span className="text-muted-foreground ml-1">({m.pct}%)</span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/40 font-bold">
                    <TableCell className="text-xs py-2.5">Grand Total</TableCell>
                    <TableCell className="text-center text-xs tabular-nums py-2.5">{fmt(platinumNum, currency)}</TableCell>
                    <TableCell className="text-center text-xs tabular-nums py-2.5">{fmt(goldNum, currency)}</TableCell>
                    <TableCell className="text-center text-xs tabular-nums py-2.5">{fmt(silverNum, currency)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* NON-MONETARY DESCRIPTION (non-monetary mode only) */}
      {/* ══════════════════════════════════════ */}
      {rewardType === 'non_monetary' && (
        <div className="space-y-3">
          <Textarea
            placeholder="Describe the recognition or non-monetary reward…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="text-sm"
          />
        </div>
      )}

      {/* ══════════════════════════════════════ */}
      {/* TIERED NON-MONETARY PERKS TABLE       */}
      {/* ══════════════════════════════════════ */}
      <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-primary">Non-Monetary Rewards by Tier</h4>
          </div>
        </div>

        <div className="relative w-full overflow-auto rounded-md border border-border/60 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold w-10">#</TableHead>
                {TIER_KEYS.map((tk) => {
                  const meta = TIER_META[tk];
                  const Icon = meta.icon;
                  return (
                    <TableHead key={tk} className="text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn('h-3.5 w-3.5', meta.iconClass)} />
                        <span>{meta.label}</span>
                        <Badge variant="secondary" className="text-[9px] ml-1">{tieredPerks[tk].length}</Badge>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: maxPerks }).map((_, rowIdx) => (
                <TableRow key={rowIdx}>
                  <TableCell className="text-xs text-muted-foreground py-1.5 w-10">{rowIdx + 1}</TableCell>
                  {TIER_KEYS.map((tk) => {
                    const perk = tieredPerks[tk][rowIdx];
                    const Icon = PERK_ICONS[rowIdx % PERK_ICONS.length];
                    return (
                      <TableCell key={tk} className="py-1.5">
                        {perk ? (
                          <div className="flex items-center gap-2 group text-xs">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 shrink-0">
                              <Icon className="h-3 w-3 text-primary" />
                            </span>
                            <span className="flex-1 text-foreground">{perk}</span>
                            <button
                              onClick={() => removePerk(tk, rowIdx)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive shrink-0"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}

              {/* Add perk row */}
              <TableRow className="bg-muted/20">
                <TableCell className="py-1.5">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </TableCell>
                {TIER_KEYS.map((tk) => (
                  <TableCell key={tk} className="py-1.5">
                    <div className="flex items-center gap-1">
                      <Input
                        value={newPerkInputs[tk]}
                        onChange={(e) => setNewPerkInputs((prev) => ({ ...prev, [tk]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerk(tk); } }}
                        placeholder={`Add ${TIER_META[tk].label} perk…`}
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => addPerk(tk)}
                        disabled={!newPerkInputs[tk].trim()}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Save Button ── */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Reward Structure
        </Button>
      </div>
    </div>
  );
}
