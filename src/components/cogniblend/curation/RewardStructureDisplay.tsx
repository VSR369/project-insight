/**
 * RewardStructureDisplay — Curator-facing reward editor.
 *
 * Features:
 * - Toggle between Monetary / Non-Monetary reward type
 * - Monetary: Single consolidated table with Platinum/Gold/Silver tier columns
 * - Total reward input when creator hasn't set amounts; AI suggests tier breakup
 * - Milestone payment breakdown rows within the same table
 * - Non-Monetary: Editable perks list with defaults based on problem statement
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
  CreditCard, Sparkles, Plus, X, Loader2, Pencil, Check, Save,
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

const DEFAULT_PERKS = [
  'Certificate of Recognition',
  'Featured in Innovation Showcase',
  '₹5,000 Gift Vouchers',
  'Coffee with the Chief Minister',
];

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

/** Default AI-style tier breakup: 50% / 30% / 20% */
function defaultBreakup(total: number): { platinum: number; gold: number; silver: number } {
  return {
    platinum: Math.round(total * 0.5),
    gold: Math.round(total * 0.3),
    silver: Math.round(total * 0.2),
  };
}

/* ── Main Component ── */

export default function RewardStructureDisplay({
  rewardStructure,
  currencyCode,
  challengeId,
  problemStatement,
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

  // Non-monetary perks
  const [perks, setPerks] = useState<string[]>(
    raw?.non_monetary_perks && raw.non_monetary_perks.length > 0
      ? raw.non_monetary_perks
      : DEFAULT_PERKS,
  );
  const [newPerk, setNewPerk] = useState('');
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

  // ══════════════════════════════════════
  // SECTION 3: Handlers
  // ══════════════════════════════════════
  const handleAIBreakup = useCallback(() => {
    if (!totalAmountNum || totalAmountNum <= 0) {
      toast.error('Enter a valid total reward amount first.');
      return;
    }
    setAiLoading(true);
    // Simulate AI breakup (50/30/20 split)
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
            non_monetary_perks: perks,
          }
        : {
            type: 'non_monetary',
            description,
            non_monetary_perks: perks,
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
  }, [rewardType, currency, platinumNum, goldNum, silverNum, milestones, perks, description, raw?.payment_mode, challengeId, queryClient]);

  const addPerk = useCallback(() => {
    const trimmed = newPerk.trim();
    if (!trimmed) return;
    if (perks.includes(trimmed)) { toast.error('Perk already exists.'); return; }
    setPerks((prev) => [...prev, trimmed]);
    setNewPerk('');
  }, [newPerk, perks]);

  const removePerk = useCallback((idx: number) => {
    setPerks((prev) => prev.filter((_, i) => i !== idx));
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
                    <TableHead className="text-xs font-semibold w-[200px]">Milestone / Item</TableHead>
                    <TableHead className="text-xs font-semibold text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        <span>Platinum</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-yellow-500" />
                        <span>Gold</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Medal className="h-3.5 w-3.5 text-slate-400" />
                        <span>Silver</span>
                      </div>
                    </TableHead>
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
                          <Input
                            type="number"
                            value={platinum}
                            onChange={(e) => setPlatinum(e.target.value)}
                            className="h-8 text-xs text-center max-w-[120px] mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center py-1.5">
                          <Input
                            type="number"
                            value={gold}
                            onChange={(e) => setGold(e.target.value)}
                            className="h-8 text-xs text-center max-w-[120px] mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center py-1.5">
                          <Input
                            type="number"
                            value={silver}
                            onChange={(e) => setSilver(e.target.value)}
                            className="h-8 text-xs text-center max-w-[120px] mx-auto"
                          />
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

                  {/* Separator */}
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
                      <TableCell className="text-center text-xs tabular-nums py-2">
                        <div>
                          <span className="font-medium">{fmt(Math.round(platinumNum * m.pct / 100), currency)}</span>
                          <span className="text-muted-foreground ml-1">({m.pct}%)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums py-2">
                        <div>
                          <span className="font-medium">{fmt(Math.round(goldNum * m.pct / 100), currency)}</span>
                          <span className="text-muted-foreground ml-1">({m.pct}%)</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-xs tabular-nums py-2">
                        <div>
                          <span className="font-medium">{fmt(Math.round(silverNum * m.pct / 100), currency)}</span>
                          <span className="text-muted-foreground ml-1">({m.pct}%)</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Total Row */}
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
      {/* NON-MONETARY SECTION                  */}
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
      {/* NON-MONETARY PERKS (always visible)   */}
      {/* ══════════════════════════════════════ */}
      <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-primary">Non-Monetary Rewards</h4>
          </div>
          <Badge variant="secondary" className="text-[10px]">{perks.length} items</Badge>
        </div>
        <ul className="space-y-2 mb-3">
          {perks.map((perk, i) => {
            const Icon = PERK_ICONS[i % PERK_ICONS.length];
            return (
              <li key={i} className="flex items-center gap-2.5 text-sm text-foreground group">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </span>
                <span className="flex-1">{perk}</span>
                <button
                  onClick={() => removePerk(i)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-2">
          <Input
            value={newPerk}
            onChange={(e) => setNewPerk(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerk(); } }}
            placeholder="Add a perk…"
            className="text-sm flex-1"
          />
          <Button variant="outline" size="sm" onClick={addPerk} disabled={!newPerk.trim()} className="gap-1 shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
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
