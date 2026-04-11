/**
 * useComplexityState — State management + handlers for ComplexityAssessmentModule.
 * Extracted to reduce module size (Batch B).
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useComplexityDimensions } from '@/hooks/queries/useComplexityDimensions';
import type { ComplexityParam } from '@/hooks/queries/useComplexityParams';
import type { SolutionType } from '@/lib/cogniblend/challengeContextAssembler';
import {
  COMPLEXITY_THRESHOLDS,
  deriveComplexityLevel,
  deriveComplexityLabel,
  getLabelForLevel,
  LEVEL_COLORS,
} from '@/lib/cogniblend/complexityScoring';
import { buildDraftFromExisting } from './complexity/complexityUtils';

export type AssessmentMode = 'AI_AUTO' | 'MANUAL_PARAMS' | 'QUICK_OVERRIDE';
export type ActiveTab = 'ai_review' | 'manual_params' | 'quick_select';

export const TAB_TO_MODE: Record<ActiveTab, AssessmentMode> = {
  ai_review: 'AI_AUTO',
  manual_params: 'MANUAL_PARAMS',
  quick_select: 'QUICK_OVERRIDE',
};

interface UseComplexityStateOptions {
  currentScore: number | null;
  currentLevel: string | null;
  currentParams: { param_key?: string; key?: string; name?: string; value?: number; score?: number }[] | null;
  complexityParams: ComplexityParam[];
  solutionType?: SolutionType | null;
  isLocked?: boolean;
  aiSuggestedRatings?: Record<string, { rating: number; justification: string }> | null;
}

export function useComplexityState({
  currentParams,
  complexityParams,
  solutionType,
  aiSuggestedRatings,
}: UseComplexityStateOptions) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (Array.isArray(currentParams)) {
      const meta = (currentParams as any)?._meta ?? (currentParams as any[]).find?.((p: any) => p._meta)?._meta;
      if (meta?.mode === 'MANUAL_PARAMS') return 'manual_params';
      if (meta?.mode === 'QUICK_OVERRIDE') return 'quick_select';
    }
    return 'ai_review';
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
    if (activeTab === 'quick_select' && Array.isArray(currentParams)) {
      const meta = (currentParams as any)?._meta;
      if (meta?.mode === 'QUICK_OVERRIDE') return meta?.level ?? null;
    }
    return null;
  });

  const [editableParams, setEditableParams] = useState<Set<string>>(new Set());
  const aiDraftRef = useRef<Record<string, number> | null>(null);
  const [aiJustifications, setAiJustifications] = useState<Record<string, string>>({});
  const [aiParamSources, setAiParamSources] = useState<Record<string, 'ai' | 'curator' | 'default'>>(() => {
    const sources: Record<string, 'ai' | 'curator' | 'default'> = {};
    complexityParams.forEach((p) => { sources[p.param_key] = 'default'; });
    return sources;
  });
  const [manualParamSources, setManualParamSources] = useState<Record<string, 'ai' | 'curator' | 'default'>>(() => {
    const sources: Record<string, 'ai' | 'curator' | 'default'> = {};
    complexityParams.forEach((p) => { sources[p.param_key] = 'default'; });
    return sources;
  });

  const [showSolutionTypeResetDialog, setShowSolutionTypeResetDialog] = useState(false);
  const [prevSolutionType, setPrevSolutionType] = useState<SolutionType | null | undefined>(solutionType);

  // ── Custom hooks ──
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

  // ── Effects ──
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
      // AI draft preserved
    }
    const freshManual = buildDraftFromExisting(currentParams, effectiveParams);
    setManualDraft(freshManual);
  }, [currentParams, effectiveParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!aiSuggestedRatings || Object.keys(aiSuggestedRatings).length === 0) return;

    const newAiDraft: Record<string, number> = {};
    const justifications: Record<string, string> = {};
    const sources: Record<string, 'ai' | 'curator' | 'default'> = {};

    effectiveParams.forEach((p) => {
      const r = aiSuggestedRatings[p.param_key];
      if (r && typeof r.rating === 'number') {
        newAiDraft[p.param_key] = Math.max(1, Math.min(10, Math.round(r.rating)));
        if (r.justification) justifications[p.param_key] = r.justification;
        sources[p.param_key] = 'ai';
      } else {
        newAiDraft[p.param_key] = aiDraft[p.param_key] ?? 5;
        sources[p.param_key] = aiParamSources[p.param_key] ?? 'default';
      }
    });

    const aiKeys = Object.keys(aiSuggestedRatings);
    const effectiveKeys = effectiveParams.map(p => p.param_key);
    const unmatchedAiKeys = aiKeys.filter(k => !effectiveKeys.includes(k));
    if (unmatchedAiKeys.length > 0) {
      // AI returned keys not matching effective params — silently ignored
    }

    setAiDraft(newAiDraft);
    aiDraftRef.current = newAiDraft;
    setAiJustifications(justifications);
    setAiParamSources(sources);
    setActiveTab('ai_review');
    setOverrideLevel(null);
    setEditableParams(new Set());
  }, [aiSuggestedRatings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived scores ──
  const activeDraft = activeTab === 'ai_review' ? aiDraft : manualDraft;

  const { weightedScore, derivedLevel, derivedLabel } = useMemo(() => {
    const totalWeight = effectiveParams.reduce((s, p) => s + p.weight, 0);
    const ws = totalWeight > 0
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

  // Quick select: derive a midpoint score from the selected level
  const displayScore = activeTab === 'quick_select'
    ? (() => {
        if (!overrideLevel) return 0;
        const t = COMPLEXITY_THRESHOLDS.find(th => th.level === overrideLevel);
        return t ? Math.round(((t.min + t.max) / 2) * 100) / 100 : 0;
      })()
    : weightedScore;
  const displayLevel = activeTab === 'quick_select' && overrideLevel ? overrideLevel : derivedLevel;
  const displayLabel = activeTab === 'quick_select' && overrideLevel ? getLabelForLevel(overrideLevel) : derivedLabel;
  const levelColor = LEVEL_COLORS[displayLevel] ?? LEVEL_COLORS.L3;

  const isDirty = useMemo(() => {
    if (activeTab === 'ai_review') return editableParams.size > 0;
    if (activeTab === 'manual_params') {
      const original = buildDraftFromExisting(currentParams, effectiveParams);
      return Object.keys(manualDraft).some((k) => manualDraft[k] !== original[k]);
    }
    if (activeTab === 'quick_select') return overrideLevel !== null;
    return false;
  }, [activeTab, editableParams, manualDraft, currentParams, effectiveParams, overrideLevel]);

  // ── Handlers ──
  const handleTabSwitch = useCallback((tab: ActiveTab) => {
    if (tab === activeTab) return;
    if (isDirty) {
      setPendingTab(tab);
      setShowConfirmDialog(true);
    } else {
      setActiveTab(tab);
      if (tab === 'manual_params') setEditableParams(new Set());
      if (tab !== 'quick_select') setOverrideLevel(null);
    }
  }, [activeTab, isDirty]);

  const handleConfirmSwitch = useCallback(() => {
    if (!pendingTab) return;
    setActiveTab(pendingTab);
    if (pendingTab === 'manual_params') {
      const fresh = buildDraftFromExisting(currentParams, effectiveParams);
      setManualDraft(fresh);
    }
    setEditableParams(new Set());
    if (pendingTab !== 'quick_select') setOverrideLevel(null);
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, [pendingTab, currentParams, effectiveParams]);

  const handleCancelSwitch = useCallback(() => {
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, []);

  const handleAiSliderChange = useCallback((paramKey: string, val: number) => {
    setAiDraft((prev) => ({ ...prev, [paramKey]: val }));
    setAiParamSources((prev) => ({ ...prev, [paramKey]: 'curator' }));
  }, []);

  const handleManualSliderChange = useCallback((paramKey: string, val: number) => {
    setManualDraft((prev) => ({ ...prev, [paramKey]: val }));
    setManualParamSources((prev) => ({ ...prev, [paramKey]: 'curator' }));
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

  const handleCancel = useCallback(() => {
    const fresh = buildDraftFromExisting(currentParams, effectiveParams);
    setAiDraft(aiDraftRef.current ?? fresh);
    setManualDraft(fresh);
    setActiveTab('ai_review');
    setOverrideLevel(null);
    setEditableParams(new Set());
    setAiJustifications({});
  }, [currentParams, effectiveParams]);

  const handleSolutionTypeReset = useCallback(() => {
    const fresh = buildDraftFromExisting(null, effectiveParams);
    setAiDraft(fresh);
    setManualDraft(fresh);
    setEditableParams(new Set());
    setAiJustifications({});
    setOverrideLevel(null);
    setShowSolutionTypeResetDialog(false);
  }, [effectiveParams]);

  return {
    // State
    activeTab, pendingTab, showConfirmDialog, setShowConfirmDialog,
    showLockConfirm, setShowLockConfirm,
    aiDraft, manualDraft, overrideLevel, editableParams,
    aiJustifications, aiParamSources, manualParamSources,
    showSolutionTypeResetDialog, setShowSolutionTypeResetDialog,

    // Derived
    effectiveParams, activeDraft,
    weightedScore, derivedLevel, derivedLabel,
    aiScoreRef_, aiLevelRef_, aiLabelRef_, hasAiRatings,
    displayScore, displayLevel, displayLabel, levelColor, isDirty,

    // Handlers
    handleTabSwitch, handleConfirmSwitch, handleCancelSwitch,
    handleAiSliderChange, handleManualSliderChange, handleToggleParamEdit,
    handleQuickSelectLevel, handleCancel, handleSolutionTypeReset,
  };
}
