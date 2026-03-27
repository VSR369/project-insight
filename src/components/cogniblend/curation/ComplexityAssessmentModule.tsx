/**
 * ComplexityAssessmentModule — 3-mode complexity assessment state machine.
 *
 * Modes:
 *   AI_AUTO        — read-only display of AI-generated or stored ratings
 *   MANUAL_PARAMS  — sliders unlocked, live weighted score recalculation
 *   QUICK_OVERRIDE — level fixed to user-selected L1–L5, sliders read-only
 *
 * Switching from AI_AUTO to any override mode requires confirmation dialog.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import { Save, X, Pencil, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplexityParam } from "@/hooks/queries/useComplexityParams";

/* ─── Types ─── */

export type AssessmentMode = "AI_AUTO" | "MANUAL_PARAMS" | "QUICK_OVERRIDE";

/* ─── Thresholds & derivation helpers ─── */

const COMPLEXITY_THRESHOLDS = [
  { level: "L1", label: "Very Low", min: 0, max: 2 },
  { level: "L2", label: "Low", min: 2, max: 4 },
  { level: "L3", label: "Medium", min: 4, max: 6 },
  { level: "L4", label: "High", min: 6, max: 8 },
  { level: "L5", label: "Very High", min: 8, max: 10 },
] as const;

function deriveComplexityLevel(score: number): string {
  const match = COMPLEXITY_THRESHOLDS.find((t) => score >= t.min && score < t.max);
  return match?.level ?? "L5";
}

function deriveComplexityLabel(score: number): string {
  const match = COMPLEXITY_THRESHOLDS.find((t) => score >= t.min && score < t.max);
  return match?.label ?? "Very High";
}

function getLabelForLevel(level: string): string {
  return COMPLEXITY_THRESHOLDS.find((t) => t.level === level)?.label ?? "Unknown";
}

/* ─── Level badge color mapping ─── */

const LEVEL_COLORS: Record<string, string> = {
  L1: "bg-green-100 text-green-800 border-green-300",
  L2: "bg-blue-100 text-blue-800 border-blue-300",
  L3: "bg-yellow-100 text-yellow-800 border-yellow-300",
  L4: "bg-orange-100 text-orange-800 border-orange-300",
  L5: "bg-red-100 text-red-800 border-red-300",
};

/* ─── Props ─── */

export interface ComplexityAssessmentModuleProps {
  challengeId: string;
  currentScore: number | null;
  currentLevel: string | null;
  currentParams: { param_key?: string; key?: string; name?: string; value?: number; score?: number }[] | null;
  complexityParams: ComplexityParam[];
  /** Extended to accept optional mode for DB persistence */
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
  const [mode, setMode] = useState<AssessmentMode>(() => {
    // Restore mode from stored params metadata if available
    if (Array.isArray(currentParams)) {
      const meta = (currentParams as any)?._meta ?? (currentParams as any[]).find?.((p: any) => p._meta)?._meta;
      if (meta?.mode && ["AI_AUTO", "MANUAL_PARAMS", "QUICK_OVERRIDE"].includes(meta.mode)) {
        return meta.mode as AssessmentMode;
      }
    }
    return "AI_AUTO";
  });

  const [pendingMode, setPendingMode] = useState<AssessmentMode | null>(null);
  const [pendingQuickLevel, setPendingQuickLevel] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [draft, setDraft] = useState<Record<string, number>>(() =>
    buildDraftFromExisting(currentParams, complexityParams),
  );

  const [overrideLevel, setOverrideLevel] = useState<string | null>(() => {
    // If stored mode was QUICK_OVERRIDE, restore the level
    if (currentLevel && mode === "QUICK_OVERRIDE") return currentLevel;
    return null;
  });

  const [aiJustifications, setAiJustifications] = useState<Record<string, string>>({});
  const [paramSources, setParamSources] = useState<Record<string, "ai" | "curator" | "default">>(() => {
    const sources: Record<string, "ai" | "curator" | "default"> = {};
    complexityParams.forEach((p) => { sources[p.param_key] = "default"; });
    return sources;
  });

  // ══════ Section 5: useEffect hooks ══════

  // Apply AI suggested ratings when they come in from the parent
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
    // AI ratings arrive → stay in AI_AUTO mode (read-only review)
    setMode("AI_AUTO");
    setOverrideLevel(null);
  }, [aiSuggestedRatings]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════ Derived score (real-time recalc) ══════
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

  // Display values based on mode
  const displayScore = mode === "AI_AUTO" ? (currentScore ?? weightedScore) : weightedScore;
  const displayLevel = mode === "QUICK_OVERRIDE" && overrideLevel
    ? overrideLevel
    : mode === "AI_AUTO"
      ? (currentLevel ?? derivedLevel)
      : derivedLevel;
  const displayLabel = mode === "QUICK_OVERRIDE" && overrideLevel
    ? getLabelForLevel(overrideLevel)
    : mode === "AI_AUTO"
      ? deriveComplexityLabel(currentScore ?? weightedScore)
      : derivedLabel;
  const levelColor = LEVEL_COLORS[displayLevel] ?? LEVEL_COLORS.L3;

  const isOverrideMode = mode !== "AI_AUTO";
  const slidersInteractive = mode === "MANUAL_PARAMS";

  // ══════ Section 7: Event handlers ══════

  /** Request to enter an override mode — gates behind confirmation if currently AI_AUTO */
  const requestModeChange = useCallback((targetMode: AssessmentMode, quickLevel?: string) => {
    if (mode === "AI_AUTO") {
      // Gate behind confirmation dialog
      setPendingMode(targetMode);
      setPendingQuickLevel(quickLevel ?? null);
      setShowConfirmDialog(true);
    } else {
      // Already in override — switch freely
      setMode(targetMode);
      if (targetMode === "QUICK_OVERRIDE" && quickLevel) {
        setOverrideLevel(quickLevel);
      }
    }
  }, [mode]);

  const handleConfirmOverride = useCallback(() => {
    if (!pendingMode) return;
    setMode(pendingMode);
    if (pendingMode === "QUICK_OVERRIDE" && pendingQuickLevel) {
      setOverrideLevel(pendingQuickLevel);
    }
    if (pendingMode === "MANUAL_PARAMS") {
      setDraft(buildDraftFromExisting(currentParams, complexityParams));
    }
    setPendingMode(null);
    setPendingQuickLevel(null);
    setShowConfirmDialog(false);
  }, [pendingMode, pendingQuickLevel, currentParams, complexityParams]);

  const handleCancelOverride = useCallback(() => {
    setPendingMode(null);
    setPendingQuickLevel(null);
    setShowConfirmDialog(false);
  }, []);

  const handleSliderChange = useCallback((paramKey: string, val: number) => {
    setDraft((prev) => ({ ...prev, [paramKey]: val }));
    setParamSources((prev) => ({ ...prev, [paramKey]: "curator" }));
  }, []);

  const handleQuickSelect = useCallback((threshold: (typeof COMPLEXITY_THRESHOLDS)[number]) => {
    if (mode === "AI_AUTO") {
      requestModeChange("QUICK_OVERRIDE", threshold.level);
    } else {
      // Already in override mode — just set the level
      setMode("QUICK_OVERRIDE");
      setOverrideLevel(threshold.level);
    }
  }, [mode, requestModeChange]);

  const handleToggleOverride = useCallback((checked: boolean) => {
    if (checked) {
      requestModeChange("MANUAL_PARAMS");
    } else {
      // Turning off override → revert to AI_AUTO
      setMode("AI_AUTO");
      setDraft(buildDraftFromExisting(currentParams, complexityParams));
      setOverrideLevel(null);
      setAiJustifications({});
    }
  }, [requestModeChange, currentParams, complexityParams]);

  const handleSave = useCallback(() => {
    const finalLevel = mode === "QUICK_OVERRIDE" && overrideLevel ? overrideLevel : derivedLevel;
    onSave(draft, weightedScore, finalLevel, mode);
    setAiJustifications({});
  }, [draft, weightedScore, derivedLevel, onSave, mode, overrideLevel]);

  const handleCancel = useCallback(() => {
    setDraft(buildDraftFromExisting(currentParams, complexityParams));
    setMode("AI_AUTO");
    setOverrideLevel(null);
    setAiJustifications({});
  }, [currentParams, complexityParams]);

  // ══════ Section 6: Conditional returns ══════
  if (complexityParams.length === 0) {
    return <p className="text-sm text-muted-foreground">No complexity parameters configured. Contact an admin.</p>;
  }

  // ══════ Section 8: Render ══════
  return (
    <div className="space-y-4">
      {/* ── Confirmation Dialog ── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Override AI Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to override the AI-generated complexity assessment.
              {pendingMode === "MANUAL_PARAMS"
                ? " You will be able to manually adjust each parameter slider."
                : ` The complexity level will be set to ${pendingQuickLevel ?? "your selection"}, disconnected from the calculated score.`}
              <br /><br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverride}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverride}>Confirm Override</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Final Complexity Score Badge ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">Final Complexity Score:</span>
        <span className="text-xl font-bold text-primary">{displayScore.toFixed(2)}</span>
        <Badge className={`text-xs border ${levelColor}`}>
          {displayLevel} — {displayLabel}
        </Badge>
        {mode === "QUICK_OVERRIDE" && (
          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
            Level Override
          </Badge>
        )}
        {mode === "MANUAL_PARAMS" && (
          <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-600">
            Manual Override
          </Badge>
        )}
      </div>

      {/* ── Quick Select Buttons ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] text-muted-foreground">Quick select:</span>
          {COMPLEXITY_THRESHOLDS.map((t) => {
            const isActive = displayLevel === t.level;
            return (
              <Button
                key={t.level}
                type="button"
                size="sm"
                variant={isActive ? "default" : "outline"}
                className="text-xs h-7 px-2"
                disabled={saving}
                onClick={() => handleQuickSelect(t)}
              >
                {t.level}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Override Assessment Toggle ── */}
      <div className="flex items-center gap-3 border-t border-border pt-3">
        <Switch
          id="override-complexity"
          checked={isOverrideMode}
          onCheckedChange={handleToggleOverride}
          disabled={saving}
        />
        <label htmlFor="override-complexity" className="text-sm font-medium text-foreground cursor-pointer">
          Override Assessment
        </label>
        {isOverrideMode && (
          <span className="text-[10px] text-muted-foreground">
            Mode: {mode === "MANUAL_PARAMS" ? "Manual Parameters" : "Quick Override"}
          </span>
        )}
      </div>

      {/* ── Parameter Sliders / Read-only bars ── */}
      <div className="space-y-3">
        {complexityParams.map((param) => {
          const value = draft[param.param_key] ?? 5;
          const barWidth = `${(value / 10) * 100}%`;
          const justification = aiJustifications[param.param_key];

          return (
            <div key={param.param_key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-sm font-medium text-foreground">{param.name}</label>
                  {paramSources[param.param_key] === "ai" && (
                    <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-200">
                      AI
                    </span>
                  )}
                  {paramSources[param.param_key] === "curator" && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-600 border-amber-200">
                      <Pencil className="h-2 w-2" />
                      Curator
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-primary">{value}</span>
              </div>
              {param.description && (
                <p className="text-xs text-muted-foreground">{param.description}</p>
              )}

              {slidersInteractive ? (
                <>
                  <Slider
                    value={[value]}
                    onValueChange={([val]) => handleSliderChange(param.param_key, val)}
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
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: barWidth }}
                  />
                </div>
              )}

              {/* AI justification */}
              {justification && (
                <p className="text-[11px] text-muted-foreground italic pl-1 border-l-2 border-primary/30">
                  {justification}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Weighted Score Summary (when in override modes) ── */}
      {isOverrideMode && (
        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground">
              {mode === "QUICK_OVERRIDE" ? "Calculated Score:" : "Weighted Score:"}
            </span>
            <span className="text-lg font-bold text-primary">{weightedScore.toFixed(2)}</span>
            {mode === "MANUAL_PARAMS" && (
              <Badge variant="secondary" className="text-xs">
                {derivedLevel} — {derivedLabel}
              </Badge>
            )}
            {mode === "QUICK_OVERRIDE" && (
              <span className="text-xs text-muted-foreground">(informational — level is overridden)</span>
            )}
          </div>
        </div>
      )}

      {/* ── Save / Cancel (only in override modes) ── */}
      {isOverrideMode && (
        <div className="flex gap-2 justify-end">
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

/* ─── Helper: build draft from existing challenge params ─── */

function buildDraftFromExisting(
  existing: ComplexityAssessmentModuleProps["currentParams"],
  masterParams: ComplexityParam[],
): Record<string, number> {
  const draft: Record<string, number> = {};
  if (Array.isArray(existing)) {
    existing.forEach((p: any) => {
      if (p._meta) return; // skip metadata entries
      const key = p.param_key ?? p.key ?? "";
      if (key) draft[key] = Number(p.value ?? p.score ?? 5);
    });
  }
  masterParams.forEach((p) => {
    if (!(p.param_key in draft)) draft[p.param_key] = 5;
  });
  return draft;
}
