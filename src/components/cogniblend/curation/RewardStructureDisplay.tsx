/**
 * RewardStructureDisplay — Orchestrator for the redesigned Reward Structure section.
 *
 * State machine:
 *   empty_no_source       → RewardTypeChooser wizard
 *   populated_from_source → Read view + SourceBanner + Edit button
 *   curator_editing       → Editable form + Save/Cancel footer
 *   saved                 → Read view + Edit button
 *   reviewed              → Read view + reviewed footer
 */

import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { parseJson } from '@/lib/cogniblend/jsonbUnwrap';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Loader2, Pencil, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Json } from '@/integrations/supabase/types';
import { useRewardStructureState } from '@/hooks/useRewardStructureState';
import { serializeRewardData } from '@/services/rewardStructureResolver';
import { requestAITierBreakup, requestAINonMonetarySuggestions } from '@/services/aiRewardBreakup';
import RewardTypeChooser from './rewards/RewardTypeChooser';
import RewardTypeToggle from './rewards/RewardTypeToggle';
import SourceBanner from './rewards/SourceBanner';
import MonetaryRewardEditor from './rewards/MonetaryRewardEditor';
import NonMonetaryRewardEditor from './rewards/NonMonetaryRewardEditor';

interface RewardStructureDisplayProps {
  rewardStructure: Json | null;
  currencyCode?: string;
  challengeId: string;
  problemStatement?: string | null;
  operatingModel?: string | null;
  challengeTitle?: string;
}

export default function RewardStructureDisplay({
  rewardStructure,
  currencyCode,
  challengeId,
  problemStatement,
  operatingModel,
  challengeTitle,
}: RewardStructureDisplayProps) {
  const queryClient = useQueryClient();

  // ── State machine ──
  const raw = useMemo(() => parseJson<any>(rewardStructure), [rewardStructure]);
  const {
    sectionState,
    rewardData,
    errors,
    isValid,
    isModified,
    setRewardType,
    setMonetary,
    setNonMonetary,
    startEditing,
    cancelEditing,
    markSaved,
    resetToSource,
    getSerializedData,
  } = useRewardStructureState(raw, operatingModel);

  // ── Local UI state ──
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // ── Challenge context for AI ──
  const challengeContext = useMemo(() => ({
    title: challengeTitle ?? '',
    domain: 'General',
    type: 'Open Innovation',
  }), [challengeTitle]);

  // ── Save handler ──
  const handleSave = useCallback(async () => {
    if (!isValid) {
      toast.error(`Fix ${errors.length} validation error(s) before saving.`);
      return;
    }
    setSaving(true);
    try {
      const serialized = getSerializedData();
      const { error } = await supabase
        .from('challenges')
        .update({ reward_structure: serialized as unknown as Json })
        .eq('id', challengeId);

      if (error) throw new Error(error.message);
      queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
      toast.success('Reward structure saved successfully');
      markSaved();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [isValid, errors, getSerializedData, challengeId, queryClient, markSaved]);

  // ── AI handlers ──
  const handleAIBreakup = useCallback(
    async (amount: number, currency: string) => {
      setAiLoading(true);
      try {
        const result = await requestAITierBreakup(amount, currency, challengeContext);
        if (result) {
          toast.success('AI suggested tier breakup applied.');
        } else {
          toast.info('AI could not generate breakup. Using default split.');
        }
        return result;
      } finally {
        setAiLoading(false);
      }
    },
    [challengeContext],
  );

  const handleAINonMonetary = useCallback(async () => {
    setAiLoading(true);
    try {
      const result = await requestAINonMonetarySuggestions(challengeContext);
      if (result) {
        toast.success('AI suggested rewards applied.');
      } else {
        toast.info('AI could not generate suggestions.');
      }
      return result;
    } finally {
      setAiLoading(false);
    }
  }, [challengeContext]);

  // ── Has existing data check for toggle ──
  const hasExistingData =
    (rewardData.monetary && rewardData.monetary.tiers.length > 0) ||
    (rewardData.nonMonetary && rewardData.nonMonetary.items.length > 0);

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* ── Empty state: Type Chooser Wizard ── */}
      {sectionState === 'empty_no_source' && !rewardData.type && (
        <RewardTypeChooser onSelect={setRewardType} />
      )}

      {/* ── Populated from source: read view + banner ── */}
      {sectionState === 'populated_from_source' && (
        <>
          <SourceBanner
            sourceRole={rewardData.sourceRole}
            sourceDate={rewardData.sourceDate}
            isModified={isModified}
            onEdit={startEditing}
            onReset={resetToSource}
          />
          {/* Read-only summary */}
          {rewardData.type === 'monetary' && rewardData.monetary && (
            <MonetaryRewardEditor
              monetary={rewardData.monetary}
              errors={[]}
              onUpdate={() => {}}
            />
          )}
          {rewardData.type === 'non_monetary' && rewardData.nonMonetary && (
            <NonMonetaryRewardEditor
              nonMonetary={rewardData.nonMonetary}
              errors={[]}
              onUpdate={() => {}}
            />
          )}
        </>
      )}

      {/* ── Curator editing ── */}
      {(sectionState === 'curator_editing' || (sectionState === 'empty_no_source' && rewardData.type)) && (
        <>
          <RewardTypeToggle
            currentType={rewardData.type}
            hasExistingData={!!hasExistingData}
            onSwitch={setRewardType}
          />

          {/* Source banner during editing if auto-populated */}
          {rewardData.isAutoPopulated && (
            <SourceBanner
              sourceRole={rewardData.sourceRole}
              sourceDate={rewardData.sourceDate}
              isModified={isModified}
              onEdit={() => {}}
              onReset={resetToSource}
            />
          )}

          {rewardData.type === 'monetary' && (
            <MonetaryRewardEditor
              monetary={rewardData.monetary}
              errors={errors.filter((e) =>
                ['currency', 'platinum.amount', 'platinum.count', 'gold.amount', 'gold.count',
                  'silver.amount', 'silver.count', 'totalPool'].includes(e.field),
              )}
              onUpdate={setMonetary}
              onAIBreakup={handleAIBreakup}
              aiLoading={aiLoading}
            />
          )}

          {rewardData.type === 'non_monetary' && (
            <NonMonetaryRewardEditor
              nonMonetary={rewardData.nonMonetary}
              errors={errors.filter((e) => e.field.startsWith('items'))}
              onUpdate={setNonMonetary}
              onAISuggest={handleAINonMonetary}
              aiLoading={aiLoading}
            />
          )}

          {/* Validation summary bar */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
              <span className="text-[12px] text-destructive">
                Fix {errors.length} issue(s) before saving
              </span>
            </div>
          )}

          {/* Save/Cancel footer */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={cancelEditing} className="gap-1.5">
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !isValid}
              className="gap-1.5"
              title={!isValid ? 'Fix validation errors first' : undefined}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Reward Structure
            </Button>
          </div>
        </>
      )}

      {/* ── Saved state: read view + edit button ── */}
      {sectionState === 'saved' && (
        <>
          {rewardData.type === 'monetary' && rewardData.monetary && (
            <MonetaryRewardEditor
              monetary={rewardData.monetary}
              errors={[]}
              onUpdate={() => {}}
            />
          )}
          {rewardData.type === 'non_monetary' && rewardData.nonMonetary && (
            <NonMonetaryRewardEditor
              nonMonetary={rewardData.nonMonetary}
              errors={[]}
              onUpdate={() => {}}
            />
          )}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
        </>
      )}

      {/* ── Reviewed state ── */}
      {sectionState === 'reviewed' && (
        <>
          {rewardData.type === 'monetary' && rewardData.monetary && (
            <MonetaryRewardEditor
              monetary={rewardData.monetary}
              errors={[]}
              onUpdate={() => {}}
            />
          )}
          {rewardData.type === 'non_monetary' && rewardData.nonMonetary && (
            <NonMonetaryRewardEditor
              nonMonetary={rewardData.nonMonetary}
              errors={[]}
              onUpdate={() => {}}
            />
          )}
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-green-700">
              ✓ Reviewed
            </span>
          </div>
        </>
      )}
    </div>
  );
}
