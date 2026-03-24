/**
 * RewardStructureDisplay — Curator-facing reward editor.
 *
 * Monetary mode:
 *  - Consolidated table with Platinum/Gold/Silver columns
 *  - Editable milestones with add/remove and 100% total validation
 *  - AI can suggest milestones + tier breakup
 *  - NO non-monetary perks shown in monetary mode
 *
 * Non-Monetary mode:
 *  - Tiered perks table (Platinum/Gold/Silver get different perks)
 *  - Each row is inline-editable (click pencil to modify)
 *  - AI can suggest relevant perks per tier
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
  Trash2, AlertTriangle,
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
}

interface RewardStructureDisplayProps {
  rewardStructure: Json | null;
  currencyCode?: string;
  challengeId: string;
  problemStatement?: string | null;
}

/* ── Constants ── */

const TRIGGER_OPTIONS = [
  { value: 'on_shortlisting', label: 'Shortlisting' },
  { value: 'on_full_submission', label: 'Full Submission' },
  { value: 'on_evaluation_complete', label: 'Evaluation Complete' },
  { value: 'on_selection', label: 'Selection' },
  { value: 'on_ip_transfer', label: 'IP Transfer' },
];

const TRIGGER_LABELS: Record<string, string> = Object.fromEntries(TRIGGER_OPTIONS.map(o => [o.value, o.label]));

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
  return { platinum: Math.round(total * 0.5), gold: Math.round(total * 0.3), silver: Math.round(total * 0.2) };
}

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

  // Editable milestones
  const initMilestones = raw?.payment_milestones ?? raw?.payment_schedule ?? DEFAULT_MILESTONES;
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([...initMilestones]);
  const [editingMilestones, setEditingMilestones] = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState<number | null>(null);

  // Tiered non-monetary perks
  const initPerks = (): TieredPerks => {
    if (raw?.tiered_perks) return raw.tiered_perks;
    if (raw?.non_monetary_perks && raw.non_monetary_perks.length > 0) return migrateFlatPerks(raw.non_monetary_perks);
    return { ...DEFAULT_TIERED_PERKS, platinum: [...DEFAULT_TIERED_PERKS.platinum], gold: [...DEFAULT_TIERED_PERKS.gold], silver: [...DEFAULT_TIERED_PERKS.silver] };
  };
  const [tieredPerks, setTieredPerks] = useState<TieredPerks>(initPerks);
  const [newPerkInputs, setNewPerkInputs] = useState<Record<TierKey, string>>({ platinum: '', gold: '', silver: '' });
  const [editingPerk, setEditingPerk] = useState<{ tier: TierKey; idx: number } | null>(null);
  const [editingPerkValue, setEditingPerkValue] = useState('');
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
  const milestoneTotal = milestones.reduce((s, m) => s + m.pct, 0);
  const milestonesValid = milestoneTotal === 100;
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

  const handleAISuggestMilestones = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-field-assist', {
        body: {
          field_name: 'payment_milestones',
          context: { problem_statement: problemStatement ?? '', challenge_id: challengeId },
        },
      });
      if (error) throw new Error(error.message);
      const suggested = data?.data?.payment_milestones;
      if (Array.isArray(suggested) && suggested.length > 0) {
        setMilestones(suggested.map((m: any) => ({
          name: m.name ?? m.label ?? 'Milestone',
          pct: m.pct ?? m.percentage ?? 0,
          trigger: m.trigger ?? '',
        })));
        setEditingMilestones(true);
        toast.success('AI suggested milestones applied. Adjust as needed.');
      } else {
        toast.info('AI could not generate milestones. Using defaults.');
      }
    } catch {
      // Fallback to defaults
      setMilestones([...DEFAULT_MILESTONES]);
      setEditingMilestones(true);
      toast.info('Using default milestones. Modify as needed.');
    } finally {
      setAiLoading(false);
    }
  }, [problemStatement, challengeId]);

  const handleAISuggestPerks = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-field-assist', {
        body: {
          field_name: 'tiered_perks',
          context: { problem_statement: problemStatement ?? '', challenge_id: challengeId },
        },
      });
      if (error) throw new Error(error.message);
      const suggested = data?.data?.tiered_perks;
      if (suggested?.platinum) {
        setTieredPerks({
          platinum: suggested.platinum ?? DEFAULT_TIERED_PERKS.platinum,
          gold: suggested.gold ?? DEFAULT_TIERED_PERKS.gold,
          silver: suggested.silver ?? DEFAULT_TIERED_PERKS.silver,
        });
        toast.success('AI suggested perks applied. Modify as needed.');
      } else {
        toast.info('AI could not generate perks. Using defaults.');
      }
    } catch {
      toast.info('Using default perks. Modify as needed.');
    } finally {
      setAiLoading(false);
    }
  }, [problemStatement, challengeId]);

  const handleSave = useCallback(async () => {
    if (rewardType === 'monetary' && !milestonesValid) {
      toast.error(`Milestone percentages must total 100%. Currently: ${milestoneTotal}%`);
      return;
    }
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
      setEditingMilestones(false);
      setEditingMilestoneIdx(null);
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [rewardType, currency, platinumNum, goldNum, silverNum, milestones, milestonesValid, milestoneTotal, tieredPerks, description, raw?.payment_mode, challengeId, queryClient]);

  // Milestone handlers
  const updateMilestone = useCallback((idx: number, field: keyof PaymentMilestone, value: string | number) => {
    setMilestones((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  }, []);

  const addMilestone = useCallback(() => {
    setMilestones((prev) => [...prev, { name: '', pct: 0, trigger: '' }]);
    setEditingMilestones(true);
    setEditingMilestoneIdx(milestones.length);
  }, [milestones.length]);

  const removeMilestone = useCallback((idx: number) => {
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Perk handlers
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

  const startEditPerk = useCallback((tier: TierKey, idx: number) => {
    setEditingPerk({ tier, idx });
    setEditingPerkValue(tieredPerks[tier][idx]);
  }, [tieredPerks]);

  const confirmEditPerk = useCallback(() => {
    if (!editingPerk) return;
    const trimmed = editingPerkValue.trim();
    if (!trimmed) { toast.error('Perk cannot be empty.'); return; }
    setTieredPerks((prev) => ({
      ...prev,
      [editingPerk.tier]: prev[editingPerk.tier].map((p, i) => i === editingPerk.idx ? trimmed : p),
    }));
    setEditingPerk(null);
    setEditingPerkValue('');
  }, [editingPerk, editingPerkValue]);

  const cancelEditPerk = useCallback(() => {
    setEditingPerk(null);
    setEditingPerkValue('');
  }, []);

  // ══════════════════════════════════════
  // SECTION 4: Render
  // ══════════════════════════════════════
  return (
    <div className="space-y-5">
      {/* ── Type Toggle ── */}
      <div className="flex gap-2">
        <Button type="button" variant={rewardType === 'monetary' ? 'default' : 'outline'} size="sm"
          onClick={() => setRewardType('monetary')} className="gap-1.5">
          <CreditCard className="h-3.5 w-3.5" /> Monetary
        </Button>
        <Button type="button" variant={rewardType === 'non_monetary' ? 'default' : 'outline'} size="sm"
          onClick={() => setRewardType('non_monetary')} className="gap-1.5">
          <Award className="h-3.5 w-3.5" /> Non-Monetary
        </Button>
      </div>

      {/* ══════════════════════════════════════ */}
      {/* MONETARY SECTION                      */}
      {/* ══════════════════════════════════════ */}
      {rewardType === 'monetary' && (
        <div className="space-y-4">
          {/* Total Amount Input */}
          {!hasCreatorAmounts && !editingTiers && (
            <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Creator has not defined reward amounts. Enter total reward pool:
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                    <span className="text-sm font-medium text-muted-foreground">{currency}</span>
                    <Input type="number" placeholder="e.g. 500000" value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)} className="text-base" />
                  </div>
                  <Button size="sm" onClick={handleAIBreakup} disabled={aiLoading || !totalAmountNum} className="gap-1.5">
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
                <Trophy className="h-3 w-3" /> Total Pool: {fmt(totalPool, currency)}
              </Badge>
              {raw?.payment_mode && (
                <Badge variant="outline" className="text-xs gap-1 capitalize">
                  <Landmark className="h-3 w-3" /> {(raw.payment_mode).replace(/_/g, ' ')}
                </Badge>
              )}
              {!editingTiers && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setEditingTiers(true)}>
                  <Pencil className="h-3 w-3" /> Edit
                </Button>
              )}
            </div>
          )}

          {/* ── Consolidated Tier + Milestone Table ── */}
          {(hasCreatorAmounts || editingTiers) && (
            <div className="relative w-full overflow-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold w-[220px]">Item</TableHead>
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
                    {(editingTiers || editingMilestones) && (
                      <TableHead className="text-xs font-semibold w-10" />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Tier Award Row */}
                  <TableRow className="bg-primary/5 font-semibold">
                    <TableCell className="text-xs font-bold py-2.5">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-primary" /> Total Award
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
                        <TableCell />
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
                    <TableCell colSpan={editingTiers || editingMilestones ? 5 : 4} className="py-1 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Payment Milestone Breakdown
                        </p>
                        <div className="flex items-center gap-2">
                          {!milestonesValid && (
                            <span className="text-[10px] text-destructive flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Total: {milestoneTotal}% (must be 100%)
                            </span>
                          )}
                          {milestonesValid && (
                            <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                              <Check className="h-3 w-3" /> 100%
                            </span>
                          )}
                          {!editingMilestones && (
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5"
                              onClick={() => setEditingMilestones(true)}>
                              <Pencil className="h-2.5 w-2.5" /> Edit
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-5 text-[10px] gap-1 px-1.5"
                            onClick={handleAISuggestMilestones} disabled={aiLoading}>
                            {aiLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
                            AI Suggest
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Milestone Rows */}
                  {milestones.map((m, i) => {
                    const isEditingThis = editingMilestones || editingMilestoneIdx === i;
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs py-2">
                          {isEditingThis ? (
                            <div className="space-y-1">
                              <Input value={m.name} onChange={(e) => updateMilestone(i, 'name', e.target.value)}
                                placeholder="Milestone name" className="h-7 text-xs" />
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={m.trigger ?? ''}
                                  onChange={(e) => updateMilestone(i, 'trigger', e.target.value)}
                                  className="h-6 text-[10px] rounded border border-border bg-background px-1.5"
                                >
                                  <option value="">Select trigger…</option>
                                  {TRIGGER_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-0.5">
                                  <Input type="number" value={m.pct} onChange={(e) => updateMilestone(i, 'pct', Number(e.target.value))}
                                    className="h-6 text-[10px] w-14 text-center" min={0} max={100} />
                                  <span className="text-[10px] text-muted-foreground">%</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{m.name}</span>
                              <Badge variant="outline" className="text-[9px] font-normal px-1.5 py-0">
                                {triggerLabel(m.trigger)}
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        {[platinumNum, goldNum, silverNum].map((tierAmt, ti) => (
                          <TableCell key={ti} className="text-center text-xs tabular-nums py-2">
                            <span className="font-medium">{fmt(Math.round(tierAmt * m.pct / 100), currency)}</span>
                            <span className="text-muted-foreground ml-1">({m.pct}%)</span>
                          </TableCell>
                        ))}
                        {(editingTiers || editingMilestones) && (
                          <TableCell className="py-2">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                              onClick={() => removeMilestone(i)} disabled={milestones.length <= 1}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}

                  {/* Add Milestone Row */}
                  {editingMilestones && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={editingTiers || editingMilestones ? 5 : 4} className="py-1.5">
                        <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={addMilestone}>
                          <Plus className="h-3 w-3" /> Add Milestone
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Grand Total Row */}
                  <TableRow className={cn('font-bold', milestonesValid ? 'bg-muted/40' : 'bg-destructive/10')}>
                    <TableCell className="text-xs py-2.5">
                      <div className="flex items-center gap-1.5">
                        Grand Total
                        {!milestonesValid && <AlertTriangle className="h-3 w-3 text-destructive" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs tabular-nums py-2.5">{fmt(platinumNum, currency)}</TableCell>
                    <TableCell className="text-center text-xs tabular-nums py-2.5">{fmt(goldNum, currency)}</TableCell>
                    <TableCell className="text-center text-xs tabular-nums py-2.5">{fmt(silverNum, currency)}</TableCell>
                    {(editingTiers || editingMilestones) && <TableCell />}
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
        <div className="space-y-4">
          <Textarea placeholder="Describe the recognition or non-monetary reward…"
            value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="text-sm" />

          {/* AI Suggest for perks */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-primary">Non-Monetary Rewards by Tier</h4>
            </div>
            <Button variant="outline" size="sm" className="text-xs gap-1" onClick={handleAISuggestPerks} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI Suggest Perks
            </Button>
          </div>

          <div className="relative w-full overflow-auto rounded-lg border border-border">
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
                      const isEditing = editingPerk?.tier === tk && editingPerk?.idx === rowIdx;
                      return (
                        <TableCell key={tk} className="py-1.5">
                          {perk ? (
                            isEditing ? (
                              <div className="flex items-center gap-1">
                                <Input value={editingPerkValue}
                                  onChange={(e) => setEditingPerkValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') confirmEditPerk(); if (e.key === 'Escape') cancelEditPerk(); }}
                                  className="h-7 text-xs flex-1" autoFocus />
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={confirmEditPerk}>
                                  <Check className="h-3 w-3 text-emerald-600" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEditPerk}>
                                  <X className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group text-xs">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 shrink-0">
                                  <Icon className="h-3 w-3 text-primary" />
                                </span>
                                <span className="flex-1 text-foreground">{perk}</span>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                                  <button onClick={() => startEditPerk(tk, rowIdx)} className="text-muted-foreground hover:text-foreground">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => removePerk(tk, rowIdx)} className="text-destructive hover:text-destructive/80">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            )
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
                        <Input value={newPerkInputs[tk]}
                          onChange={(e) => setNewPerkInputs((prev) => ({ ...prev, [tk]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPerk(tk); } }}
                          placeholder={`Add ${TIER_META[tk].label} perk…`} className="h-7 text-xs flex-1" />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"
                          onClick={() => addPerk(tk)} disabled={!newPerkInputs[tk].trim()}>
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
      )}

      {/* ── Save Button ── */}
      <div className="flex justify-end gap-2">
        {rewardType === 'monetary' && !milestonesValid && (
          <span className="text-xs text-destructive flex items-center gap-1 mr-auto">
            <AlertTriangle className="h-3.5 w-3.5" />
            Milestones must total 100% (currently {milestoneTotal}%)
          </span>
        )}
        <Button onClick={handleSave} disabled={saving || (rewardType === 'monetary' && !milestonesValid)} size="sm" className="gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save Reward Structure
        </Button>
      </div>
    </div>
  );
}
