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

import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Save, X, Pencil, Bot, SlidersHorizontal, Zap, Check, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplexityParam } from "@/hooks/queries/useComplexityParams";
import { useComplexityDimensions } from "@/hooks/queries/useComplexityDimensions";
import type { SolutionType } from "@/lib/cogniblend/challengeContextAssembler";
import {
  COMPLEXITY_THRESHOLDS,
  deriveComplexityLevel,
  deriveComplexityLabel,
  getLabelForLevel,
  LEVEL_COLORS,
  LEVEL_CARD_COLORS,
} from "@/lib/cogniblend/complexityScoring";

/* ─── Types ─── */

export type AssessmentMode = "AI_AUTO" | "MANUAL_PARAMS" | "QUICK_OVERRIDE";

type ActiveTab = "ai_review" | "manual_params" | "quick_select";

const TAB_TO_MODE: Record<ActiveTab, AssessmentMode> = {
  ai_review: "AI_AUTO",
  manual_params: "MANUAL_PARAMS",
  quick_select: "QUICK_OVERRIDE",
};

/* ─── Props ─── */

export interface ComplexityAssessmentModuleProps {
  challengeId: string;
  currentScore: number | null;
  currentLevel: string | null;
  currentParams: { param_key?: string; key?: string; name?: string; value?: number; score?: number }[] | null;
  complexityParams: ComplexityParam[];
  solutionType?: SolutionType | null;
  onSave: (params: Record<string, number>, score: number, level: string, mode?: AssessmentMode) => void;
  onLock?: () => void;
  onUnlock?: () => void;
  isLocked?: boolean;
  saving: boolean;
  aiSuggestedRatings?: Record<string, { rating: number; justification: string }> | null;
}

export function ComplexityAssessmentModule({
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
}: ComplexityAssessmentModuleProps) {
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

  // Separate drafts: AI Review and Manual Params are isolated
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

  // Build effective params: overlay solution-type dimensions onto generic params
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

  // Detect solutionType change → prompt reset
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

  // AI suggested ratings → update ONLY aiDraft, never manualDraft
  useEffect(() => {
    if (!aiSuggestedRatings || Object.keys(aiSuggestedRatings).length === 0) return;

    const newAiDraft: Record<string, number> = {};
    const justifications: Record<string, string> = {};
    const sources: Record<string, "ai" | "curator" | "default"> = {};

    complexityParams.forEach((p) => {
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

    setAiDraft(newAiDraft);
    setAiJustifications(justifications);
    setAiParamSources(sources);
    setActiveTab("ai_review");
    setOverrideLevel(null);
    setEditableParams(new Set());
  }, [aiSuggestedRatings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════ Derived scores (separate for each draft) ══════

  const activeDraft = activeTab === "ai_review" ? aiDraft : manualDraft;

  const { weightedScore, derivedLevel, derivedLabel } = useMemo(() => {
    const totalWeight = complexityParams.reduce((s, p) => s + p.weight, 0);
    const ws =
      totalWeight > 0
        ? complexityParams.reduce((s, p) => s + (activeDraft[p.param_key] ?? 5) * p.weight, 0) / totalWeight
        : 5;
    const score = Math.round(ws * 100) / 100;
    return {
      weightedScore: score,
      derivedLevel: deriveComplexityLevel(score),
      derivedLabel: deriveComplexityLabel(score),
    };
  }, [activeDraft, complexityParams]);

  const hasDraftValues = Object.keys(activeDraft).length > 0;
  const displayScore = activeTab === "quick_select" ? 0
    : hasDraftValues ? weightedScore
    : (currentScore ?? weightedScore);
  const displayLevel = activeTab === "quick_select" && overrideLevel
    ? overrideLevel
    : hasDraftValues ? derivedLevel
    : (currentLevel ?? derivedLevel);
  const displayLabel = activeTab === "quick_select" && overrideLevel
    ? getLabelForLevel(overrideLevel)
    : hasDraftValues ? derivedLabel
    : deriveComplexityLabel(currentScore ?? weightedScore);
  const levelColor = LEVEL_COLORS[displayLevel] ?? LEVEL_COLORS.L3;

  // Dirty state
  const isDirty = useMemo(() => {
    if (activeTab === "ai_review") return editableParams.size > 0;
    if (activeTab === "manual_params") {
      const original = buildDraftFromExisting(currentParams, complexityParams);
      return Object.keys(manualDraft).some((k) => manualDraft[k] !== original[k]);
    }
    if (activeTab === "quick_select") return overrideLevel !== null;
    return false;
  }, [activeTab, editableParams, manualDraft, currentParams, complexityParams, overrideLevel]);

  // ══════ Section 7: Event handlers ══════

  const handleTabSwitch = useCallback((tab: ActiveTab) => {
    if (tab === activeTab) return;
    if (isDirty) {
      setPendingTab(tab);
      setShowConfirmDialog(true);
    } else {
      setActiveTab(tab);
      if (tab === "manual_params") {
        setEditableParams(new Set());
      }
      if (tab !== "quick_select") {
        setOverrideLevel(null);
      }
    }
  }, [activeTab, isDirty]);

  const handleConfirmSwitch = useCallback(() => {
    if (!pendingTab) return;
    setActiveTab(pendingTab);
    // Reset state for new tab — each draft is independent, just clear edit markers
    const fresh = buildDraftFromExisting(currentParams, complexityParams);
    if (pendingTab === "manual_params") {
      setManualDraft(fresh);
    }
    setEditableParams(new Set());
    if (pendingTab !== "quick_select") setOverrideLevel(null);
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, [pendingTab, currentParams, complexityParams]);

  const handleCancelSwitch = useCallback(() => {
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, []);

  // AI Review tab slider change → only aiDraft
  const handleAiSliderChange = useCallback((paramKey: string, val: number) => {
    setAiDraft((prev) => ({ ...prev, [paramKey]: val }));
    setAiParamSources((prev) => ({ ...prev, [paramKey]: "curator" }));
  }, []);

  // Manual Params tab slider change → only manualDraft
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
    onSave(draftToSave, finalScore, finalLevel, mode);
    setAiJustifications({});
    setEditableParams(new Set());
  }, [activeTab, aiDraft, manualDraft, weightedScore, derivedLevel, onSave, overrideLevel]);

  const handleCancel = useCallback(() => {
    const fresh = buildDraftFromExisting(currentParams, complexityParams);
    setAiDraft(fresh);
    setManualDraft(fresh);
    setActiveTab("ai_review");
    setOverrideLevel(null);
    setEditableParams(new Set());
    setAiJustifications({});
  }, [currentParams, complexityParams]);

  // ══════ Conditional returns ══════
  if (complexityParams.length === 0) {
    return <p className="text-sm text-muted-foreground">No complexity parameters configured. Contact an admin.</p>;
  }

  const showActions = !isLocked && (
    (activeTab === "ai_review" && editableParams.size > 0) ||
    activeTab === "manual_params" ||
    (activeTab === "quick_select" && overrideLevel !== null)
  );

  // Whether lock button should show (data exists)
  const hasExistingAssessment = currentScore != null || currentLevel != null;

  // ══════ Section 8: Render ══════
  return (
    <div className="space-y-4">
      {/* ── Locked Banner ── */}
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

      {/* ── Dirty-state Confirmation Dialog ── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Switching will discard them. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelSwitch}>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSwitch}>Discard & Switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Lock Confirmation Dialog ── */}
      <AlertDialog open={showLockConfirm} onOpenChange={setShowLockConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock Complexity Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize the complexity assessment. All tabs will become read-only.
              The locked values will be used as the basis for downstream pricing and reward calculations.
              You can unlock it later if corrections are needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowLockConfirm(false); onLock?.(); }}>
              <Lock className="h-3.5 w-3.5 mr-1" />Lock Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── 3-Tab Card Selector ── */}
      <div className="grid grid-cols-3 gap-2">
        <TabCard
          icon={<Bot className="h-4 w-4" />}
          title="AI Review"
          subtitle="Recommended"
          active={activeTab === "ai_review"}
          onClick={() => handleTabSwitch("ai_review")}
          disabled={isLocked}
        />
        <TabCard
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="Manual Params"
          subtitle="Adjust each slider"
          active={activeTab === "manual_params"}
          onClick={() => handleTabSwitch("manual_params")}
          disabled={isLocked}
        />
        <TabCard
          icon={<Zap className="h-4 w-4" />}
          title="Quick Select"
          subtitle="Pick a level"
          active={activeTab === "quick_select"}
          onClick={() => handleTabSwitch("quick_select")}
          disabled={isLocked}
        />
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "ai_review" && (
        <AIReviewTab
          complexityParams={complexityParams}
          draft={aiDraft}
          paramSources={aiParamSources}
          aiJustifications={aiJustifications}
          editableParams={editableParams}
          displayScore={displayScore}
          displayLevel={displayLevel}
          displayLabel={displayLabel}
          levelColor={levelColor}
          saving={saving}
          readOnly={isLocked}
          onSliderChange={handleAiSliderChange}
          onToggleEdit={handleToggleParamEdit}
        />
      )}

      {activeTab === "manual_params" && (
        <ManualParamsTab
          complexityParams={complexityParams}
          draft={manualDraft}
          paramSources={manualParamSources}
          aiJustifications={aiJustifications}
          weightedScore={weightedScore}
          derivedLevel={derivedLevel}
          derivedLabel={derivedLabel}
          levelColor={LEVEL_COLORS[derivedLevel] ?? LEVEL_COLORS.L3}
          saving={saving}
          readOnly={isLocked}
          onSliderChange={handleManualSliderChange}
        />
      )}

      {activeTab === "quick_select" && (
        <QuickSelectTab
          overrideLevel={overrideLevel}
          saving={saving}
          readOnly={isLocked}
          onSelectLevel={handleQuickSelectLevel}
        />
      )}

      {/* ── Save / Cancel / Lock ── */}
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
            <Button
              size="sm"
              variant="default"
              onClick={() => setShowLockConfirm(true)}
              disabled={saving}
              className="bg-primary/90 hover:bg-primary"
            >
              <Lock className="h-3.5 w-3.5 mr-1" />Lock Complexity
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════ */

/** Tab card selector button */
function TabCard({
  icon,
  title,
  subtitle,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !active}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all",
        disabled && !active
          ? "opacity-50 cursor-not-allowed border-border bg-muted"
          : "cursor-pointer",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
          : !disabled && "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
      )}
    >
      <span className={cn("flex items-center gap-1.5 text-sm font-medium", active ? "text-primary" : "text-foreground")}>
        {icon} {title}
      </span>
      <span className="text-[10px] text-muted-foreground">{subtitle}</span>
    </button>
  );
}

/** Tab 1: AI Review — read-only bars with per-param inline edit */
function AIReviewTab({
  complexityParams,
  draft,
  paramSources,
  aiJustifications,
  editableParams,
  displayScore,
  displayLevel,
  displayLabel,
  levelColor,
  saving,
  readOnly,
  onSliderChange,
  onToggleEdit,
}: {
  complexityParams: ComplexityParam[];
  draft: Record<string, number>;
  paramSources: Record<string, "ai" | "curator" | "default">;
  aiJustifications: Record<string, string>;
  editableParams: Set<string>;
  displayScore: number;
  displayLevel: string;
  displayLabel: string;
  levelColor: string;
  saving: boolean;
  readOnly?: boolean;
  onSliderChange: (key: string, val: number) => void;
  onToggleEdit: (key: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Score badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">Complexity Score:</span>
        <span className="text-xl font-bold text-primary">{displayScore.toFixed(2)}</span>
        <Badge className={`text-xs border ${levelColor}`}>
          {displayLevel} — {displayLabel}
        </Badge>
      </div>

      {/* Parameter bars */}
      <div className="space-y-3">
        {complexityParams.map((param) => {
          const value = draft[param.param_key] ?? 5;
          const barWidth = `${(value / 10) * 100}%`;
          const justification = aiJustifications[param.param_key];
          const isEditable = !readOnly && editableParams.has(param.param_key);
          const source = paramSources[param.param_key];

          return (
            <div key={param.param_key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium text-foreground">{param.name}</label>
                  {source === "ai" && !isEditable && (
                    <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">AI</span>
                  )}
                  {(source === "curator" || isEditable) && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                      <Pencil className="h-2 w-2" />Curator
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-primary">{value}</span>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onToggleEdit(param.param_key)}
                      className={cn(
                        "p-1 rounded-md transition-colors",
                        isEditable
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent",
                      )}
                      title={isEditable ? "Lock parameter" : "Edit this parameter"}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              {param.description && (
                <p className="text-xs text-muted-foreground">{param.description}</p>
              )}

              {isEditable ? (
                <>
                  <Slider
                    value={[value]}
                    onValueChange={([val]) => onSliderChange(param.param_key, val)}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                    disabled={saving}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Low (1)</span>
                    <span>Weight: {(param.weight * 100).toFixed(0)}%</span>
                    <span>High (10)</span>
                  </div>
                </>
              ) : (
                <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: barWidth }} />
                </div>
              )}

              {justification && (
                <p className="text-[11px] text-muted-foreground italic pl-1 border-l-2 border-primary/30">
                  {justification}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tab 2: Manual Parameters — all sliders interactive */
function ManualParamsTab({
  complexityParams,
  draft,
  paramSources,
  aiJustifications,
  weightedScore,
  derivedLevel,
  derivedLabel,
  levelColor,
  saving,
  readOnly,
  onSliderChange,
}: {
  complexityParams: ComplexityParam[];
  draft: Record<string, number>;
  paramSources: Record<string, "ai" | "curator" | "default">;
  aiJustifications: Record<string, string>;
  weightedScore: number;
  derivedLevel: string;
  derivedLabel: string;
  levelColor: string;
  saving: boolean;
  readOnly?: boolean;
  onSliderChange: (key: string, val: number) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Live score */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">Weighted Score:</span>
        <span className="text-xl font-bold text-primary">{weightedScore.toFixed(2)}</span>
        <Badge className={`text-xs border ${levelColor}`}>
          {derivedLevel} — {derivedLabel}
        </Badge>
      </div>

      {/* All sliders */}
      <div className="space-y-3">
        {complexityParams.map((param) => {
          const value = draft[param.param_key] ?? 5;
          const justification = aiJustifications[param.param_key];
          const source = paramSources[param.param_key];

          return (
            <div key={param.param_key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium text-foreground">{param.name}</label>
                  {source === "ai" && (
                    <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">AI</span>
                  )}
                  {source === "curator" && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                      <Pencil className="h-2 w-2" />Curator
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-primary">{value}</span>
              </div>
              {param.description && (
                <p className="text-xs text-muted-foreground">{param.description}</p>
              )}

              <Slider
                value={[value]}
                onValueChange={([val]) => onSliderChange(param.param_key, val)}
                min={1}
                max={10}
                step={1}
                className="w-full"
                disabled={saving || readOnly}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Low (1)</span>
                <span>Weight: {(param.weight * 100).toFixed(0)}%</span>
                <span>High (10)</span>
              </div>

              {justification && (
                <p className="text-[11px] text-muted-foreground italic pl-1 border-l-2 border-primary/30">
                  {justification}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tab 3: Quick Select — descriptive level cards, no score/sliders */
function QuickSelectTab({
  overrideLevel,
  saving,
  readOnly,
  onSelectLevel,
}: {
  overrideLevel: string | null;
  saving: boolean;
  readOnly?: boolean;
  onSelectLevel: (level: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Select a complexity level directly. This overrides the calculated score.
      </p>
      <div className="grid grid-cols-1 gap-2">
        {COMPLEXITY_THRESHOLDS.map((t) => {
          const isSelected = overrideLevel === t.level;
          const colors = LEVEL_CARD_COLORS[t.level];

          return (
            <button
              key={t.level}
              type="button"
              disabled={saving || readOnly}
              onClick={() => onSelectLevel(t.level)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
                readOnly && "opacity-70 cursor-not-allowed",
                isSelected
                  ? `${colors.bg} ${colors.ring} ring-2 border-transparent`
                  : "border-border bg-card hover:bg-accent/50",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm font-semibold", isSelected ? colors.text : "text-foreground")}>
                    {t.level} — {t.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Score {t.min}–{t.max}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              </div>
              {isSelected && (
                <div className={cn("shrink-0 rounded-full p-0.5", colors.bg)}>
                  <Check className={cn("h-4 w-4", colors.text)} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Helper: build draft from existing challenge params ─── */

function buildDraftFromExisting(
  existing: ComplexityAssessmentModuleProps["currentParams"],
  masterParams: ComplexityParam[],
): Record<string, number> {
  const draft: Record<string, number> = {};
  if (Array.isArray(existing)) {
    existing.forEach((p: any) => {
      if (p._meta) return;
      const key = p.param_key ?? p.key ?? "";
      if (key) draft[key] = Number(p.value ?? p.score ?? 5);
    });
  }
  masterParams.forEach((p) => {
    if (!(p.param_key in draft)) draft[p.param_key] = 5;
  });
  return draft;
}
