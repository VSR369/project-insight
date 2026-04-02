/**
 * ComplexityAssessmentModule — 3-tab card selector for complexity assessment.
 * State + handlers delegated to useComplexityState hook.
 */

import { forwardRef, useImperativeHandle, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Save, X, Bot, SlidersHorizontal, Zap, Lock, Unlock } from 'lucide-react';
import { DirtyConfirmDialog, LockConfirmDialog, SolutionTypeResetDialog } from './complexity/ComplexityDialogs';
import { useComplexityState, TAB_TO_MODE } from '@/hooks/cogniblend/useComplexityState';
import { deriveComplexityLevel } from '@/lib/cogniblend/complexityScoring';
import { LEVEL_COLORS } from '@/lib/cogniblend/complexityScoring';
import {
  TabCard,
  AIReviewTab,
  ManualParamsTab,
  QuickSelectTab,
} from './complexity/ComplexitySubComponents';
import type { ComplexityParam } from '@/hooks/queries/useComplexityParams';
import type { SolutionType } from '@/lib/cogniblend/challengeContextAssembler';

export type { AssessmentMode } from '@/hooks/cogniblend/useComplexityState';

export interface ResolvedParam {
  param_key: string;
  name: string;
  value: number;
  weight: number;
}

export interface ComplexityModuleHandle {
  saveAiDraft: () => void;
}

export interface ComplexityAssessmentModuleProps {
  challengeId: string;
  currentScore: number | null;
  currentLevel: string | null;
  currentParams: { param_key?: string; key?: string; name?: string; value?: number; score?: number }[] | null;
  complexityParams: ComplexityParam[];
  solutionType?: SolutionType | null;
  onSave: (params: Record<string, number>, score: number, level: string, mode?: string, resolvedParams?: ResolvedParam[]) => void;
  onLock?: () => void;
  onUnlock?: () => void;
  isLocked?: boolean;
  saving: boolean;
  aiSuggestedRatings?: Record<string, { rating: number; justification: string }> | null;
}

export const ComplexityAssessmentModule = forwardRef<ComplexityModuleHandle, ComplexityAssessmentModuleProps>(function ComplexityAssessmentModule({
  currentScore, currentLevel, currentParams, complexityParams, solutionType,
  onSave, onLock, onUnlock, isLocked = false, saving, aiSuggestedRatings,
}, ref) {
  const state = useComplexityState({
    currentScore, currentLevel, currentParams, complexityParams,
    solutionType, isLocked, aiSuggestedRatings,
  });

  const handleSave = useCallback(() => {
    const mode = TAB_TO_MODE[state.activeTab];
    const finalLevel = state.activeTab === 'quick_select' && state.overrideLevel ? state.overrideLevel : state.derivedLevel;
    const finalScore = state.activeTab === 'quick_select' ? 0 : state.weightedScore;
    const draftToSave = state.activeTab === 'ai_review' ? state.aiDraft : state.manualDraft;
    const resolvedParams: ResolvedParam[] = state.effectiveParams.map((p) => ({
      param_key: p.param_key, name: p.name,
      value: draftToSave[p.param_key] ?? 5, weight: p.weight,
    }));
    onSave(draftToSave, finalScore, finalLevel, mode, resolvedParams);
  }, [state.activeTab, state.aiDraft, state.manualDraft, state.weightedScore, state.derivedLevel, onSave, state.overrideLevel, state.effectiveParams]);

  useImperativeHandle(ref, () => ({
    saveAiDraft: () => {
      const totalWeight = state.effectiveParams.reduce((s, p) => s + p.weight, 0);
      const ws = totalWeight > 0
        ? state.effectiveParams.reduce((s, p) => s + (state.aiDraft[p.param_key] ?? 5) * p.weight, 0) / totalWeight
        : 5;
      const score = Math.round(ws * 100) / 100;
      const level = deriveComplexityLevel(score);
      const resolvedParams: ResolvedParam[] = state.effectiveParams.map((p) => ({
        param_key: p.param_key, name: p.name,
        value: state.aiDraft[p.param_key] ?? 5, weight: p.weight,
      }));
      onSave(state.aiDraft, score, level, 'AI_AUTO', resolvedParams);
    },
  }), [state.aiDraft, state.effectiveParams, onSave]);

  if (state.effectiveParams.length === 0) {
    return <p className="text-sm text-muted-foreground">No complexity parameters configured. Contact an admin.</p>;
  }

  const showActions = !isLocked && (
    (state.activeTab === 'ai_review' && state.editableParams.size > 0) ||
    state.activeTab === 'manual_params' ||
    (state.activeTab === 'quick_select' && state.overrideLevel !== null)
  );
  const hasExistingAssessment = currentScore != null || currentLevel != null;

  return (
    <div className="space-y-4">
      {isLocked && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Complexity Assessment Locked</span>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Final</Badge>
          </div>
          {onUnlock && (
            <Button variant="ghost" size="sm" onClick={onUnlock} className="text-xs text-muted-foreground hover:text-foreground">
              <Unlock className="h-3 w-3 mr-1" />Unlock
            </Button>
          )}
        </div>
      )}

      <DirtyConfirmDialog open={state.showConfirmDialog} onOpenChange={state.setShowConfirmDialog} onStay={state.handleCancelSwitch} onDiscard={state.handleConfirmSwitch} />
      <LockConfirmDialog open={state.showLockConfirm} onOpenChange={state.setShowLockConfirm} onLock={() => { state.setShowLockConfirm(false); onLock?.(); }} />
      <SolutionTypeResetDialog open={state.showSolutionTypeResetDialog} onOpenChange={state.setShowSolutionTypeResetDialog} onReset={state.handleSolutionTypeReset} />

      <div className="grid grid-cols-3 gap-2">
        <TabCard icon={<Bot className="h-4 w-4" />} title="AI Review" subtitle="Recommended" active={state.activeTab === 'ai_review'} onClick={() => state.handleTabSwitch('ai_review')} disabled={isLocked} />
        <TabCard icon={<SlidersHorizontal className="h-4 w-4" />} title="Manual Params" subtitle="Adjust each slider" active={state.activeTab === 'manual_params'} onClick={() => state.handleTabSwitch('manual_params')} disabled={isLocked} />
        <TabCard icon={<Zap className="h-4 w-4" />} title="Quick Select" subtitle="Pick a level" active={state.activeTab === 'quick_select'} onClick={() => state.handleTabSwitch('quick_select')} disabled={isLocked} />
      </div>

      {state.activeTab === 'ai_review' && (
        <AIReviewTab complexityParams={state.effectiveParams} draft={state.aiDraft} paramSources={state.aiParamSources} aiJustifications={state.aiJustifications} editableParams={state.editableParams} displayScore={state.displayScore} displayLevel={state.displayLevel} displayLabel={state.displayLabel} levelColor={state.levelColor} saving={saving} readOnly={isLocked} onSliderChange={state.handleAiSliderChange} onToggleEdit={state.handleToggleParamEdit} />
      )}
      {state.activeTab === 'manual_params' && (
        <ManualParamsTab complexityParams={state.effectiveParams} draft={state.manualDraft} paramSources={state.manualParamSources} aiJustifications={state.aiJustifications} weightedScore={state.weightedScore} derivedLevel={state.derivedLevel} derivedLabel={state.derivedLabel} levelColor={LEVEL_COLORS[state.derivedLevel] ?? LEVEL_COLORS.L3} saving={saving} readOnly={isLocked} onSliderChange={state.handleManualSliderChange} aiScoreRef={state.hasAiRatings ? state.aiScoreRef_ : null} aiLevelRef={state.hasAiRatings ? state.aiLevelRef_ : null} aiLabelRef={state.hasAiRatings ? state.aiLabelRef_ : null} />
      )}
      {state.activeTab === 'quick_select' && (
        <QuickSelectTab overrideLevel={state.overrideLevel} saving={saving} readOnly={isLocked} onSelectLevel={state.handleQuickSelectLevel} />
      )}

      {!isLocked && (
        <div className="flex gap-2 justify-end border-t border-border pt-3">
          {showActions && (
            <>
              <Button variant="outline" size="sm" onClick={state.handleCancel} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
          {hasExistingAssessment && onLock && !showActions && (
            <Button size="sm" variant="default" onClick={() => state.setShowLockConfirm(true)} disabled={saving} className="bg-primary/90 hover:bg-primary">
              <Lock className="h-3.5 w-3.5 mr-1" />Lock Complexity
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
