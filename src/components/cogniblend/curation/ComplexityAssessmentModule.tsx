/**
 * ComplexityAssessmentModule — 3-tab card selector for complexity assessment.
 *
 * Tabs:
 *   🤖 AI Review       — read-only bars with per-param inline edit (pencil icon)
 *   🎚️ Manual Params   — all sliders interactive, live weighted score
 *   ⚡ Quick Select     — descriptive level cards, no score/sliders
 *
 * Dirty-state confirmation dialog on tab switch only.
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
import { Save, X, Pencil, Bot, SlidersHorizontal, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplexityParam } from "@/hooks/queries/useComplexityParams";
import {
  COMPLEXITY_THRESHOLDS,
  deriveComplexityLevel,
  deriveComplexityLabel,
  getLabelForLevel,
  LEVEL_COLORS,
  LEVEL_CARD_COLORS,
} from "@/lib/cogniblend/complexityScoring";

/* ─── Props ─── */

export interface ComplexityAssessmentModuleProps {
  challengeId: string;
  currentScore: number | null;
  currentLevel: string | null;
  currentParams: { param_key?: string; key?: string; name?: string; value?: number; score?: number }[] | null;
  complexityParams: ComplexityParam[];
  onSave: (params: Record<string, number>, score: number, level: string, mode?: AssessmentMode) => void;
  saving: boolean;
  aiSuggestedRatings?: Record<string, { rating: number; justification: string }> | null;
}

export function ComplexityAssessmentModule({
  challengeId,
  currentScore,
  currentLevel,
  currentParams,
  complexityParams,
  onSave,
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

  const [draft, setDraft] = useState<Record<string, number>>(() =>
    buildDraftFromExisting(currentParams, complexityParams),
  );

  const [overrideLevel, setOverrideLevel] = useState<string | null>(() => {
    if (currentLevel && activeTab === "quick_select") return currentLevel;
    return null;
  });

  const [editableParams, setEditableParams] = useState<Set<string>>(new Set());
  const [aiJustifications, setAiJustifications] = useState<Record<string, string>>({});
  const [paramSources, setParamSources] = useState<Record<string, "ai" | "curator" | "default">>(() => {
    const sources: Record<string, "ai" | "curator" | "default"> = {};
    complexityParams.forEach((p) => { sources[p.param_key] = "default"; });
    return sources;
  });

  // ══════ Section 5: useEffect hooks ══════

  useEffect(() => {
    if (!aiSuggestedRatings || Object.keys(aiSuggestedRatings).length === 0) return;

    const newDraft: Record<string, number> = {};
    const justifications: Record<string, string> = {};
    const sources: Record<string, "ai" | "curator" | "default"> = {};

    complexityParams.forEach((p) => {
      const r = aiSuggestedRatings[p.param_key];
      if (r && typeof r.rating === "number") {
        newDraft[p.param_key] = Math.max(1, Math.min(10, Math.round(r.rating)));
        if (r.justification) justifications[p.param_key] = r.justification;
        sources[p.param_key] = "ai";
      } else {
        newDraft[p.param_key] = draft[p.param_key] ?? 5;
        sources[p.param_key] = paramSources[p.param_key] ?? "default";
      }
    });

    setDraft(newDraft);
    setAiJustifications(justifications);
    setParamSources(sources);
    setActiveTab("ai_review");
    setOverrideLevel(null);
    setEditableParams(new Set());
  }, [aiSuggestedRatings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════ Derived score ══════

  const { weightedScore, derivedLevel, derivedLabel } = useMemo(() => {
    const totalWeight = complexityParams.reduce((s, p) => s + p.weight, 0);
    const ws =
      totalWeight > 0
        ? complexityParams.reduce((s, p) => s + (draft[p.param_key] ?? 5) * p.weight, 0) / totalWeight
        : 5;
    const score = Math.round(ws * 100) / 100;
    return {
      weightedScore: score,
      derivedLevel: deriveComplexityLevel(score),
      derivedLabel: deriveComplexityLabel(score),
    };
  }, [draft, complexityParams]);

  // Display values — always derive from draft when draft has been populated
  // This prevents score=0 when currentScore is stale after tab navigation
  const hasDraftValues = Object.keys(draft).length > 0;
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

  // Dirty state: has the user made changes in the current tab?
  const isDirty = useMemo(() => {
    if (activeTab === "ai_review") return editableParams.size > 0;
    if (activeTab === "manual_params") {
      const original = buildDraftFromExisting(currentParams, complexityParams);
      return Object.keys(draft).some((k) => draft[k] !== original[k]);
    }
    if (activeTab === "quick_select") return overrideLevel !== null;
    return false;
  }, [activeTab, editableParams, draft, currentParams, complexityParams, overrideLevel]);

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
    // Reset state for new tab
    setDraft(buildDraftFromExisting(currentParams, complexityParams));
    setEditableParams(new Set());
    if (pendingTab !== "quick_select") setOverrideLevel(null);
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, [pendingTab, currentParams, complexityParams]);

  const handleCancelSwitch = useCallback(() => {
    setPendingTab(null);
    setShowConfirmDialog(false);
  }, []);

  const handleSliderChange = useCallback((paramKey: string, val: number) => {
    setDraft((prev) => ({ ...prev, [paramKey]: val }));
    setParamSources((prev) => ({ ...prev, [paramKey]: "curator" }));
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
    onSave(draft, finalScore, finalLevel, mode);
    setAiJustifications({});
    setEditableParams(new Set());
  }, [activeTab, draft, weightedScore, derivedLevel, onSave, overrideLevel]);

  const handleCancel = useCallback(() => {
    setDraft(buildDraftFromExisting(currentParams, complexityParams));
    setActiveTab("ai_review");
    setOverrideLevel(null);
    setEditableParams(new Set());
    setAiJustifications({});
  }, [currentParams, complexityParams]);

  // ══════ Conditional returns ══════
  if (complexityParams.length === 0) {
    return <p className="text-sm text-muted-foreground">No complexity parameters configured. Contact an admin.</p>;
  }

  // Whether save/cancel should show
  const showActions =
    (activeTab === "ai_review" && editableParams.size > 0) ||
    activeTab === "manual_params" ||
    (activeTab === "quick_select" && overrideLevel !== null);

  // ══════ Section 8: Render ══════
  return (
    <div className="space-y-4">
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

      {/* ── 3-Tab Card Selector ── */}
      <div className="grid grid-cols-3 gap-2">
        <TabCard
          icon={<Bot className="h-4 w-4" />}
          title="AI Review"
          subtitle="Recommended"
          active={activeTab === "ai_review"}
          onClick={() => handleTabSwitch("ai_review")}
        />
        <TabCard
          icon={<SlidersHorizontal className="h-4 w-4" />}
          title="Manual Params"
          subtitle="Adjust each slider"
          active={activeTab === "manual_params"}
          onClick={() => handleTabSwitch("manual_params")}
        />
        <TabCard
          icon={<Zap className="h-4 w-4" />}
          title="Quick Select"
          subtitle="Pick a level"
          active={activeTab === "quick_select"}
          onClick={() => handleTabSwitch("quick_select")}
        />
      </div>

      {/* ── Tab Content ── */}
      {activeTab === "ai_review" && (
        <AIReviewTab
          complexityParams={complexityParams}
          draft={draft}
          paramSources={paramSources}
          aiJustifications={aiJustifications}
          editableParams={editableParams}
          displayScore={displayScore}
          displayLevel={displayLevel}
          displayLabel={displayLabel}
          levelColor={levelColor}
          saving={saving}
          onSliderChange={handleSliderChange}
          onToggleEdit={handleToggleParamEdit}
        />
      )}

      {activeTab === "manual_params" && (
        <ManualParamsTab
          complexityParams={complexityParams}
          draft={draft}
          paramSources={paramSources}
          aiJustifications={aiJustifications}
          weightedScore={weightedScore}
          derivedLevel={derivedLevel}
          derivedLabel={derivedLabel}
          levelColor={LEVEL_COLORS[derivedLevel] ?? LEVEL_COLORS.L3}
          saving={saving}
          onSliderChange={handleSliderChange}
        />
      )}

      {activeTab === "quick_select" && (
        <QuickSelectTab
          overrideLevel={overrideLevel}
          saving={saving}
          onSelectLevel={handleQuickSelectLevel}
        />
      )}

      {/* ── Save / Cancel ── */}
      {showActions && (
        <div className="flex gap-2 justify-end border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1" />Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
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
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-all cursor-pointer",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
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
          const isEditable = editableParams.has(param.param_key);
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
                disabled={saving}
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
  onSelectLevel,
}: {
  overrideLevel: string | null;
  saving: boolean;
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
              disabled={saving}
              onClick={() => onSelectLevel(t.level)}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
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
