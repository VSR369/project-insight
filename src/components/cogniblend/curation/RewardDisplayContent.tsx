/**
 * RewardDisplayContent — State-driven content rendering for the Reward Structure section.
 * Extracted from RewardStructureDisplay.tsx to reduce parent size.
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Pencil, AlertCircle, X, Info, Lock } from "lucide-react";
import RewardTypeChooser from "./rewards/RewardTypeChooser";
import RewardTypeToggle from "./rewards/RewardTypeToggle";
import SourceBanner from "./rewards/SourceBanner";
import MonetaryRewardEditor from "./rewards/MonetaryRewardEditor";
import NonMonetaryRewardEditor from "./rewards/NonMonetaryRewardEditor";
import PrizeTierEditor from "./rewards/PrizeTierEditor";
import IncentiveSelector from "./rewards/IncentiveSelector";
import EffectiveSolverValue from "./rewards/EffectiveSolverValue";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { RewardType } from "@/services/rewardStructureResolver";
import type { TierState } from "@/hooks/useRewardStructureState";
import type { NonMonetaryItemData } from "@/types/sections";

export interface RewardDisplayContentProps {
  // State
  sectionState: string;
  rewardType: RewardType | null;
  rewardData: any;
  tierStates: Record<string, TierState>;
  nmItems: NMItemState[];
  currency: string;
  totalPool: number;
  errors: any[];
  monetaryErrors: any[];
  nmErrors: any[];
  isValid: boolean;
  isModified: boolean;
  isSubmitted: boolean;
  isTypeLocked: boolean;
  isDirty: boolean;
  saving: boolean;
  hasAISuggestions: boolean;
  aiRationale?: string;
  showBothBanner: boolean;
  activeTab: 'monetary' | 'non_monetary';
  hasExistingData: boolean;
  currencyCode?: string;

  // Computed
  showMonetary: boolean;
  showNM: boolean;
  isEditing: boolean;
  cashPool: number;
  currSym: string;

  // Prize tiers & incentives
  prizeTiers: any[];
  incentiveSelections: any[];
  allIncentives: any[];
  maturityLevel?: string | null;
  complexityLevel?: string | null;

  // Handlers
  onSetActiveTab: (tab: 'monetary' | 'non_monetary') => void;
  onTypeSwitch: (type: RewardType) => void;
  onTypeSwitchFromReadOnly: (type: RewardType) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onResetToSource: () => void;
  onSave: () => void;
  onLockRewardType: () => void;
  onUpdateTier: (rank: string, patch: Partial<TierState>) => void;
  onCurrencyChange: (cur: string) => void;
  onAcceptAISuggestion: (rank: string) => void;
  onAcceptAllMonetaryAI: () => void;
  onAddNMItem: (title: string) => void;
  onUpdateNMItem: (id: string, title: string) => void;
  onDeleteNMItem: (id: string) => void;
  onAcceptNMSuggestion: (id: string) => void;
  onAcceptAllNMAI: () => void;
  onAddPrizeTier: () => void;
  onUpdatePrizeTier: (id: string, updates: any) => void;
  onDeletePrizeTier: (id: string) => void;
  onReorderPrizeTier: (id: string, direction: 'up' | 'down') => void;
  onAddIncentive: (incentiveId: string) => void;
  onRemoveIncentive: (selectionId: string) => void;
  onUpdateCommitment: (selectionId: string, commitment: string) => void;
}

export function RewardDisplayContent(props: RewardDisplayContentProps) {
  const {
    sectionState, rewardType, rewardData, tierStates, nmItems,
    currency, totalPool, errors, monetaryErrors, nmErrors,
    isValid, isModified, isSubmitted, isTypeLocked, isDirty, saving,
    hasAISuggestions, aiRationale, showBothBanner, activeTab, hasExistingData,
    currencyCode, showMonetary, showNM, isEditing, cashPool, currSym,
    prizeTiers, incentiveSelections, allIncentives, maturityLevel, complexityLevel,
    onSetActiveTab, onTypeSwitch, onTypeSwitchFromReadOnly,
    onStartEditing, onCancelEditing, onResetToSource, onSave, onLockRewardType,
    onUpdateTier, onCurrencyChange, onAcceptAISuggestion, onAcceptAllMonetaryAI,
    onAddNMItem, onUpdateNMItem, onDeleteNMItem, onAcceptNMSuggestion, onAcceptAllNMAI,
    onAddPrizeTier, onUpdatePrizeTier, onDeletePrizeTier, onReorderPrizeTier,
    onAddIncentive, onRemoveIncentive, onUpdateCommitment,
  } = props;

  const renderMonetaryEditor = (disabled: boolean, showErrors: boolean) => (
    <MonetaryRewardEditor
      tierStates={tierStates}
      currency={currency}
      totalPool={totalPool}
      errors={showErrors ? monetaryErrors : []}
      disabled={disabled}
      onUpdateTier={disabled ? () => {} : onUpdateTier}
      onCurrencyChange={disabled ? () => {} : onCurrencyChange}
      onAcceptAISuggestion={disabled ? () => {} : onAcceptAISuggestion}
      onAcceptAllAI={disabled ? undefined : onAcceptAllMonetaryAI}
      hasAISuggestions={hasAISuggestions}
      aiRationale={aiRationale}
    />
  );

  const renderNMEditor = (disabled: boolean, showErrors: boolean) => (
    <NonMonetaryRewardEditor
      items={nmItems}
      errors={showErrors ? nmErrors : []}
      disabled={disabled}
      onAddItem={disabled ? () => {} : onAddNMItem}
      onUpdateItem={disabled ? () => {} : onUpdateNMItem}
      onDeleteItem={disabled ? () => {} : onDeleteNMItem}
      onAcceptAISuggestion={disabled ? undefined : onAcceptNMSuggestion}
      onAcceptAllAI={disabled ? undefined : onAcceptAllNMAI}
    />
  );

  const renderBothTabs = (disabled: boolean, showErrors: boolean) => (
    <Tabs value={activeTab} onValueChange={(v) => onSetActiveTab(v as any)} className="w-full">
      <TabsList className="mb-3">
        <TabsTrigger value="monetary" className="text-xs gap-1">
          💰 Monetary
          {monetaryErrors.length > 0 && showErrors && (
            <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-[9px] px-1.5">{monetaryErrors.length}</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="non_monetary" className="text-xs gap-1">
          🏆 Non-Monetary
          {nmErrors.length > 0 && showErrors && (
            <span className="ml-1 bg-destructive text-destructive-foreground rounded-full text-[9px] px-1.5">{nmErrors.length}</span>
          )}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="monetary">{renderMonetaryEditor(disabled, showErrors)}</TabsContent>
      <TabsContent value="non_monetary">{renderNMEditor(disabled, showErrors)}</TabsContent>
    </Tabs>
  );

  const renderContent = (disabled: boolean, showErrors: boolean) => {
    if (rewardType === 'both') return renderBothTabs(disabled, showErrors);
    if (showMonetary) return renderMonetaryEditor(disabled, showErrors);
    if (showNM) return renderNMEditor(disabled, showErrors);
    return null;
  };

  const budgetRange = (source: any) => source ? {
    min: source.budgetMin ?? 0,
    max: source.budgetMax ?? 0,
    currency: source.currency ?? currencyCode ?? 'USD',
  } : rewardData.monetary?.budgetMin || rewardData.monetary?.budgetMax ? {
    min: rewardData.monetary.budgetMin ?? 0,
    max: rewardData.monetary.budgetMax ?? 0,
    currency: rewardData.monetary?.currency ?? currencyCode ?? 'USD',
  } : undefined;

  return (
    <div className="space-y-5">
      {showBothBanner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Info className="h-3 w-3 text-blue-500 shrink-0" />
          <span className="text-[12px] text-blue-700">AM defined both reward types. Review each tab independently before submitting.</span>
        </div>
      )}

      {/* Empty state */}
      {sectionState === 'empty_no_source' && !rewardType && <RewardTypeChooser onSelect={onTypeSwitch} />}

      {/* Populated from source */}
      {sectionState === 'populated_from_source' && (
        <>
          <SourceBanner sourceRole={rewardData.upstreamSource?.role ?? rewardData.sourceRole} sourceDate={rewardData.upstreamSource?.date ?? rewardData.sourceDate} isModified={isModified} onEdit={onStartEditing} onReset={onResetToSource} budgetRange={budgetRange(rewardData.upstreamSource)} />
          <RewardTypeToggle currentType={rewardType} hasExistingData={hasExistingData} isLocked={isTypeLocked} onSwitch={onTypeSwitchFromReadOnly} />
          {renderContent(true, false)}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={onStartEditing} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
          </div>
        </>
      )}

      {/* Curator editing */}
      {isEditing && (
        <>
          <RewardTypeToggle currentType={rewardType} hasExistingData={!!hasExistingData} disabled={isSubmitted} isLocked={isTypeLocked} onSwitch={onTypeSwitch} />
          {(rewardData.isAutoPopulated || rewardData.upstreamSource) && (
            <SourceBanner sourceRole={rewardData.upstreamSource?.role ?? rewardData.sourceRole} sourceDate={rewardData.upstreamSource?.date ?? rewardData.sourceDate} isModified={isModified} onEdit={() => {}} onReset={onResetToSource} budgetRange={budgetRange(rewardData.upstreamSource)} />
          )}
          {renderContent(isSubmitted, true)}
          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
              <span className="text-[12px] text-destructive">Fix {errors.length} issue(s) before saving</span>
            </div>
          )}
          {!isSubmitted && (
            <div className="flex justify-end gap-2">
              {isDirty && <Button variant="outline" size="sm" onClick={onCancelEditing} className="gap-1.5"><X className="h-3.5 w-3.5" /> Cancel</Button>}
              {!isTypeLocked && rewardType && (
                <Button size="sm" variant="outline" onClick={onLockRewardType} disabled={saving} className="gap-1.5"><Lock className="h-3.5 w-3.5" /> Lock Reward Type</Button>
              )}
              {isDirty && (
                <Button size="sm" variant="outline" onClick={onSave} disabled={saving || !isValid || !rewardType} className="gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Saved state */}
      {sectionState === 'saved' && !isEditing && (
        <>
          {rewardData.upstreamSource && <SourceBanner sourceRole={rewardData.upstreamSource.role} sourceDate={rewardData.upstreamSource.date} isModified={true} onEdit={onStartEditing} budgetRange={budgetRange(rewardData.upstreamSource)} />}
          <RewardTypeToggle currentType={rewardType} hasExistingData={hasExistingData} disabled={isSubmitted} isLocked={isTypeLocked} onSwitch={onTypeSwitchFromReadOnly} />
          {renderContent(true, false)}
          {!isSubmitted && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onStartEditing} className="gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
            </div>
          )}
        </>
      )}

      {/* Reviewed state */}
      {sectionState === 'reviewed' && (
        <>
          {rewardData.upstreamSource && <SourceBanner sourceRole={rewardData.upstreamSource.role} sourceDate={rewardData.upstreamSource.date} isModified={true} onEdit={onStartEditing} budgetRange={budgetRange(rewardData.upstreamSource)} />}
          <RewardTypeToggle currentType={rewardType} hasExistingData={hasExistingData} disabled={isSubmitted} isLocked={isTypeLocked} onSwitch={onTypeSwitchFromReadOnly} />
          {renderContent(true, false)}
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-[12px] font-semibold text-green-700">✓ Reviewed</span>
          </div>
        </>
      )}

      {/* Prize Tier Editor */}
      {rewardType && showMonetary && prizeTiers.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">Prize Tier Breakdown</h4>
          <PrizeTierEditor tiers={prizeTiers} totalPool={cashPool} currencySymbol={currSym} disabled={isSubmitted || (!isEditing && sectionState !== 'saved')} onAddTier={onAddPrizeTier} onUpdateTier={onUpdatePrizeTier} onDeleteTier={onDeletePrizeTier} onReorder={onReorderPrizeTier} />
        </div>
      )}

      {/* Incentive Selector */}
      {rewardType && (
        <div className="border-t border-border pt-4">
          <IncentiveSelector availableIncentives={allIncentives} selections={incentiveSelections} maturityLevel={maturityLevel} complexityLevel={complexityLevel} disabled={isSubmitted || (!isEditing && sectionState !== 'saved')} onAdd={onAddIncentive} onRemove={onRemoveIncentive} onUpdateCommitment={onUpdateCommitment} />
        </div>
      )}

      {/* Effective Solver Value */}
      {rewardType && (cashPool > 0 || incentiveSelections.length > 0) && (
        <EffectiveSolverValue cashPool={cashPool} currencySymbol={currSym} selections={incentiveSelections} />
      )}
    </div>
  );
}
