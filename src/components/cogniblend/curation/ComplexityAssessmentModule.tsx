/**
 * ComplexityAssessmentModule — 3-tab card selector for complexity assessment.
 *
 * Tabs:
 *   🤖 AI Review       — read-only bars with per-param inline edit (pencil icon)
 *   🎚️ Manual Params   — all sliders interactive, live weighted score
 *   ⚡ Quick Select     — descriptive level cards, no score/sliders
 *
 * State isolation: AI Review uses `aiDraft`, Manual Params uses `manualDraft`.
 * Lock mechanism: Once locked, all tabs become read-only.
 */

import { useState, useMemo, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Save, X, Bot, SlidersHorizontal, Zap, Lock, Unlock } from "lucide-react";
import { DirtyConfirmDialog, LockConfirmDialog, SolutionTypeResetDialog } from "./complexity/ComplexityDialogs";
import type { ComplexityParam } from "@/hooks/queries/useComplexityParams";
import { useComplexityDimensions } from "@/hooks/queries/useComplexityDimensions";
import type { SolutionType } from "@/lib/cogniblend/challengeContextAssembler";
import {
  deriveComplexityLevel,
  deriveComplexityLabel,
  getLabelForLevel,
  LEVEL_COLORS,
} from "@/lib/cogniblend/complexityScoring";
import {
  TabCard,
  AIReviewTab,
  ManualParamsTab,
  QuickSelectTab,
  buildDraftFromExisting,
} from "./complexity/ComplexitySubComponents";

/* ─── Types ─── */

export type AssessmentMode = "AI_AUTO" | "MANUAL_PARAMS" | "QUICK_OVERRIDE";

type ActiveTab = "ai_review" | "manual_params" | "quick_select";

const TAB_TO_MODE: Record<ActiveTab, AssessmentMode> = {
  ai_review: "AI_AUTO",
  manual_params: "MANUAL_PARAMS",
  quick_select: "QUICK_OVERRIDE",
};

/* ─── Props ─── */

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
  onSave: (params: Record<string, number>, score: number, level: string, mode?: AssessmentMode, resolvedParams?: ResolvedParam[]) => void;
  onLock?: () => void;
  onUnlock?: () => void;
  isLocked?: boolean;
  saving: boolean;
  aiSuggestedRatings?: Record<string, { rating: number; justification: string }> | null;
}

export const ComplexityAssessmentModule = forwardRef<ComplexityModuleHandle, ComplexityAssessmentModuleProps>(function ComplexityAssessmentModule({
  challengeId,
  currentScore,
  currentLevel,
  currentParams,
  complexityParams,
  solutionType,
  onSave,
  onLock,
  onUnlock,
  isLocked = false,
  saving,
  aiSuggestedRatings,
}, ref) {
  // ══════ Section 1: useState hooks ══════

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (Array.isArray(currentParams)) {
      const meta = (currentParams as any)?._meta ?? (currentParams as any[]).find?.((p: any) => p._meta)?._meta;
      if (meta?.mode === "MANUAL_PARAMS") return "manual_params";
      if (meta?.mode === "QUICK_OVERRIDE") return "quick_select";
    }
    return "ai_review";
  });

  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showLockConfirm, setShowLockConfirm] = useState(false);

  const [aiDraft, setAiDraft] = useState<Record<string, number>>(() =>
    buildDraftFromExisting(currentParams, complexityParams),
  );
  const [manualDraft, setManualDraft] = useState<Record<string, number>>(() =>
    buildDraftFromExisting(currentParams, complexityParams),
  );

  const [overrideLevel, setOverrideLevel] = useState<string | null>(() => {
    if (currentLevel && activeTab === "quick_select") return currentLevel;
    return null;
  });

  const [editableParams, setEditableParams] = useState<Set<string>>(new Set());
  const aiDraftRef = useRef<Record<string, number> | null>(null);
  const [aiJustifications, setAiJustifications] = useState<Record<string, string>>({});
  const [aiParamSources, setAiParamSources] = useState<Record<string, "ai" | "curator" | "default">>(() => {
    const sources: Record<string, "ai" | "curator" | "default"> = {};
    complexityParams.forEach((p) => { sources[p.param_key] = "default"; });
    return sources;
  });
  const [manualParamSources, setManualParamSources] = useState<Record<string, "ai" | "curator" | "default">>(() => {
    const sources: Record<string, "ai" | "curator" | "default"> = {};
    complexityParams.forEach((p) => { sources[p.param_key] = "default"; });
    return sources;
  });

  const [showSolutionTypeResetDialog, setShowSolutionTypeResetDialog] = useState(false);
  const [prevSolutionType, setPrevSolutionType] = useState<SolutionType | null | undefined>(solutionType);

  // ══════ Section 2: Custom hooks ══════

  const { data: solutionDimensions } = useComplexityDimensions(solutionType ?? null);

  const effectiveParams = useMemo<ComplexityParam[]>(() => {
    if (!solutionDimensions || solutionDimensions.length === 0) return complexityParams;
    return solutionDimensions.map((dim) => ({
      id: dim.id,
      param_key: dim.dimension_key,
      name: dim.dimension_name,
      weight: 1 / solutionDimensions.length,
      description: `L1: ${dim.level_1_description} → L3: ${dim.level_3_description} → L5: ${dim.level_5_description}`,
      display_order: dim.display_order,
      is_active: true,
    }));
  }, [solutionDimensions, complexityParams]);

  // ══════ Section 5: useEffect hooks ══════

  useEffect(() => {
    if (prevSolutionType !== undefined && solutionType !== prevSolutionType) {
      const hasScores = Object.values(aiDraft).some(v => v !== 5) || Object.values(manualDraft).some(v => v !== 5);
      if (hasScores) {
        setShowSolutionTypeResetDialog(true);
      } else {
        const fresh = buildDraftFromExisting(null, effectiveParams);
        setAiDraft(fresh);
        setManualDraft(fresh);
      }
    }
    setPrevSolutionType(solutionType);
  }, [solutionType]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevCurrentParamsRef = useRef(currentParams);
  useEffect(() => {
    if (currentParams === prevCurrentParamsRef.current) return;
    prevCurrentParamsRef.current = currentParams;
    if (aiDraftRef.current && Object.keys(aiDraftRef.current).length > 0) {
      // AI draft preserved — don't overwrite
    }
    const freshManual = buildDraftFromExisting(currentParams, effectiveParams);
    setManualDraft(freshManual);
  }, [currentParams, effectiveParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aiSuggestedRatings || Object.keys(aiSuggestedRatings).length === 0) return;

    const newAiDraft: Record<string, number> = {};
    const justifications: Record<string, string> = {};
    const sources: Record<string, "ai" | "curator" | "default"> = {};

    effectiveParams.forEach((p) => {
      const r = aiSuggestedRatings[p.param_key];
      if (r && typeof r.rating === "number") {
        newAiDraft[p.param_key] = Math.max(1, Math.min(10, Math.round(r.rating)));
        if (r.justification) justifications[p.param_key] = r.justification;
        sources[p.param_key] = "ai";
      } else {
        newAiDraft[p.param_key] = aiDraft[p.param_key] ?? 5;
        sources[p.param_key] = aiParamSources[p.param_key] ?? "default";
      }
    });

    const aiKeys = Object.keys(aiSuggestedRatings);
    const effectiveKeys = effectiveParams.map(p => p.param_key);
    const unmatchedAiKeys = aiKeys.filter(k => !effectiveKeys.includes(k));
    if (unmatchedAiKeys.length > 0) {
      console.warn(
        `[ComplexityModule] AI returned ${unmatchedAiKeys.length} unmatched keys:`,
        unmatchedAiKeys,
        'Expected:', effectiveKeys
      );
    }

    setAiDraft(newAiDraft);
    aiDraftRef.current = newAiDraft;
    setAiJustifications(justifications);
    setAiParamSources(sources);
    setActiveTab("ai_review");
    setOverrideLevel(null);
    setEditableParams(new Set());
  }, [aiSuggestedRatings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════ Derived scores ══════

  const activeDraft = activeTab === "ai_review" ? aiDraft : manualDraft;

  const { weightedScore, derivedLevel, derivedLabel } = useMemo(() => {
    const totalWeight = effectiveParams.reduce((s, p) => s + p.weight, 0);
    const ws =
      totalWeight > 0
        ? effectiveParams.reduce((s, p) => s + (activeDraft[p.param_key] ?? 5) * p.weight, 0) / totalWeight
        : 5;
    const score = Math.round(ws * 100) / 100;
    return {
      weightedScore: score,
      derivedLevel: deriveComplexityLevel(score),
      derivedLabel: deriveComplexityLabel(score),
    };
  }, [activeDraft, effectiveParams]);

  const aiScoreRef_ = useMemo(() => {
    if (Object.keys(aiDraft).length === 0) return null;
    const totalWeight = effectiveParams.reduce((s, p) => s + p.weight, 0);
    if (totalWeight === 0) return null;
    const ws = effectiveParams.reduce((s, p) => s + (aiDraft[p.param_key] ?? 5) * p.weight, 0) / totalWeight;
    return Math.round(ws * 100) / 100;
  }, [aiDraft, effectiveParams]);
  const aiLevelRef_ = aiScoreRef_ != null ? deriveComplexityLevel(aiScoreRef_) : null;
  const aiLabelRef_ = aiScoreRef_ != null ? deriveComplexityLabel(aiScoreRef_) : null;
  const hasAiRatings = !!aiSuggestedRatings && Object.keys(aiSuggestedRatings).length > 0;

  const displayScore = activeTab === "quick_select" ? 0 : weightedScore;
  const displayLevel = activeTab === "quick_select" && overrideLevel ? overrideLevel : derivedLevel;
  const displayLabel = activeTab === "quick_select" && overrideLevel ? getLabelForLevel(overrideLevel) : derivedLabel;
  const levelColor = LEVEL_COLORS[displayLevel] ?? LEVEL_COLORS.L3;

  const isDirty = useMemo(() => {
    if (activeTab === "ai_review") return editableParams.size > 0;
    if (activeTab === "manual_params") {
      const original = buildDraftFromExisting(currentParams, effectiveParams);
      return Object.keys(manualDraft).some((k) => manualDraft[k] !== original[k]);
    }
    if (activeTab === "quick_select") return overrideLevel !== null;
    return false;
  }, [activeTab, editableParams, manualDraft, currentParams, effectiveParams, overrideLevel]);

  // ══════ Section 7: Event handlers ══════

  const handleTabSwitch = useCallback((tab: ActiveTab) => {
    if (tab === activeTab) return;
    if (isDirty) {
      setPendingTab(tab);
      setShowConfirmDialog(true);
    } else {
      setActiveTab(tab);
      if (tab === "manual_params") setEditableParams(new Set());
      if (tab !== "quick_select") setOverrideLevel(null);
    }
  }, [activeTab, isDirty]);

  const handleConfirmSwitch = useCallback(() => {
    if (!pendingTab) return;
    setActiveTab(pendingTab);
    if (pendingTab === "manual_params") {
      const fresh = buildDraftFromExisting(currentParams, effectiveParams);
      setManualDraft(fresh);
    }
    setEditableParams(new Set());
    if (pendingTab !== "quick_select") setOverrideLevel(null);
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, [pendingTab, currentParams, effectiveParams]);

  const handleCancelSwitch = useCallback(() => {
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, []);

  const handleAiSliderChange = useCallback((paramKey: string, val: number) => {
    setAiDraft((prev) => ({ ...prev, [paramKey]: val }));
    setAiParamSources((prev) => ({ ...prev, [paramKey]: "curator" }));
  }, []);

  const handleManualSliderChange = useCallback((paramKey: string, val: number) => {
    setManualDraft((prev) => ({ ...prev, [paramKey]: val }));
    setManualParamSources((prev) => ({ ...prev, [paramKey]: "curator" }));
  }, []);

  const handleToggleParamEdit = useCallback((paramKey: string) => {
    setEditableParams((prev) => {
      const next = new Set(prev);
      if (next.has(paramKey)) next.delete(paramKey);
      else next.add(paramKey);
      return next;
    });
  }, []);

  const handleQuickSelectLevel = useCallback((level: string) => {
    setOverrideLevel(level);
  }, []);

  const handleSave = useCallback(() => {
    const mode = TAB_TO_MODE[activeTab];
    const finalLevel = activeTab === "quick_select" && overrideLevel ? overrideLevel : derivedLevel;
    const finalScore = activeTab === "quick_select" ? 0 : weightedScore;
    const draftToSave = activeTab === "ai_review" ? aiDraft : manualDraft;
    const resolvedParams: ResolvedParam[] = effectiveParams.map((p) => ({
      param_key: p.param_key,
      name: p.name,
      value: draftToSave[p.param_key] ?? 5,
      weight: p.weight,
    }));
    onSave(draftToSave, finalScore, finalLevel, mode, resolvedParams);
    setAiJustifications({});
    setEditableParams(new Set());
  }, [activeTab, aiDraft, manualDraft, weightedScore, derivedLevel, onSave, overrideLevel, effectiveParams]);

  useImperativeHandle(ref, () => ({
    saveAiDraft: () => {
      const totalWeight = effectiveParams.reduce((s, p) => s + p.weight, 0);
      const ws = totalWeight > 0
        ? effectiveParams.reduce((s, p) => s + (aiDraft[p.param_key] ?? 5) * p.weight, 0) / totalWeight
        : 5;
      const score = Math.round(ws * 100) / 100;
      const level = deriveComplexityLevel(score);
      const resolvedParams: ResolvedParam[] = effectiveParams.map((p) => ({
        param_key: p.param_key,
        name: p.name,
        value: aiDraft[p.param_key] ?? 5,
        weight: p.weight,
      }));
      onSave(aiDraft, score, level, "AI_AUTO", resolvedParams);
    },
  }), [aiDraft, effectiveParams, onSave]);

  const handleCancel = useCallback(() => {
    const fresh = buildDraftFromExisting(currentParams, effectiveParams);
    setAiDraft(aiDraftRef.current ?? fresh);
    setManualDraft(fresh);
    setActiveTab("ai_review");
    setOverrideLevel(null);
    setEditableParams(new Set());
    setAiJustifications({});
  }, [currentParams, effectiveParams]);

  // ══════ Conditional returns ══════
  if (effectiveParams.length === 0) {
    return <p className="text-sm text-muted-foreground">No complexity parameters configured. Contact an admin.</p>;
  }

  const showActions = !isLocked && (
    (activeTab === "ai_review" && editableParams.size > 0) ||
    activeTab === "manual_params" ||
    (activeTab === "quick_select" && overrideLevel !== null)
  );

  const hasExistingAssessment = currentScore != null || currentLevel != null;

  // ══════ Section 8: Render ══════
  return (
    <div className="space-y-4">
      {/* Locked Banner */}
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

      <DirtyConfirmDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog} onStay={handleCancelSwitch} onDiscard={handleConfirmSwitch} />

      <LockConfirmDialog open={showLockConfirm} onOpenChange={setShowLockConfirm} onLock={() => { setShowLockConfirm(false); onLock?.(); }} />

      <SolutionTypeResetDialog open={showSolutionTypeResetDialog} onOpenChange={setShowSolutionTypeResetDialog} onReset={() => {
        const fresh = buildDraftFromExisting(null, effectiveParams);
        setAiDraft(fresh);
        setManualDraft(fresh);
        setEditableParams(new Set());
        setAiJustifications({});
        setOverrideLevel(null);
        setShowSolutionTypeResetDialog(false);
      }} />

      {/* 3-Tab Card Selector */}
      <div className="grid grid-cols-3 gap-2">
        <TabCard icon={<Bot className="h-4 w-4" />} title="AI Review" subtitle="Recommended" active={activeTab === "ai_review"} onClick={() => handleTabSwitch("ai_review")} disabled={isLocked} />
        <TabCard icon={<SlidersHorizontal className="h-4 w-4" />} title="Manual Params" subtitle="Adjust each slider" active={activeTab === "manual_params"} onClick={() => handleTabSwitch("manual_params")} disabled={isLocked} />
        <TabCard icon={<Zap className="h-4 w-4" />} title="Quick Select" subtitle="Pick a level" active={activeTab === "quick_select"} onClick={() => handleTabSwitch("quick_select")} disabled={isLocked} />
      </div>

      {/* Tab Content */}
      {activeTab === "ai_review" && (
        <AIReviewTab complexityParams={effectiveParams} draft={aiDraft} paramSources={aiParamSources} aiJustifications={aiJustifications} editableParams={editableParams} displayScore={displayScore} displayLevel={displayLevel} displayLabel={displayLabel} levelColor={levelColor} saving={saving} readOnly={isLocked} onSliderChange={handleAiSliderChange} onToggleEdit={handleToggleParamEdit} />
      )}
      {activeTab === "manual_params" && (
        <ManualParamsTab complexityParams={effectiveParams} draft={manualDraft} paramSources={manualParamSources} aiJustifications={aiJustifications} weightedScore={weightedScore} derivedLevel={derivedLevel} derivedLabel={derivedLabel} levelColor={LEVEL_COLORS[derivedLevel] ?? LEVEL_COLORS.L3} saving={saving} readOnly={isLocked} onSliderChange={handleManualSliderChange} aiScoreRef={hasAiRatings ? aiScoreRef_ : null} aiLevelRef={hasAiRatings ? aiLevelRef_ : null} aiLabelRef={hasAiRatings ? aiLabelRef_ : null} />
      )}
      {activeTab === "quick_select" && (
        <QuickSelectTab overrideLevel={overrideLevel} saving={saving} readOnly={isLocked} onSelectLevel={handleQuickSelectLevel} />
      )}

      {/* Save / Cancel / Lock */}
      {!isLocked && (
        <div className="flex gap-2 justify-end border-t border-border pt-3">
          {showActions && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" />Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
          {hasExistingAssessment && onLock && !showActions && (
            <Button size="sm" variant="default" onClick={() => setShowLockConfirm(true)} disabled={saving} className="bg-primary/90 hover:bg-primary">
              <Lock className="h-3.5 w-3.5 mr-1" />Lock Complexity
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
