/**
 * ComplexityAssessmentModule — Standalone complexity assessment with override toggle.
 *
 * Default: read-only display of AI-generated parameters + Final Complexity Score badge.
 * Override toggle: unlocks sliders for manual adjustment with real-time recalculation.
 * Quick-select: L1–L5 buttons always available for instant level override.
 */

import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Save, X } from "lucide-react";
import type { ComplexityParam } from "@/hooks/queries/useComplexityParams";

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
  /** Current complexity_score from the challenge record */
  currentScore: number | null;
  /** Current complexity_level from the challenge record */
  currentLevel: string | null;
  /** Current complexity_parameters (parsed JSON array) */
  currentParams: { param_key?: string; key?: string; name?: string; value?: number; score?: number }[] | null;
  /** Master complexity params from useComplexityParams() */
  complexityParams: ComplexityParam[];
  /** Callback to persist changes */
  onSave: (params: Record<string, number>, score: number, level: string) => void;
  /** Whether a save is in progress */
  saving: boolean;
}

export function ComplexityAssessmentModule({
  currentScore,
  currentLevel,
  currentParams,
  complexityParams,
  onSave,
  saving,
}: ComplexityAssessmentModuleProps) {
  // ══════ State ══════
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>(() =>
    buildDraftFromExisting(currentParams, complexityParams),
  );

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

  // Display score: when override is active show live calculation, else show stored value
  const displayScore = overrideEnabled ? weightedScore : (currentScore ?? weightedScore);
  const displayLevel = overrideEnabled ? derivedLevel : (currentLevel ?? derivedLevel);
  const displayLabel = overrideEnabled ? derivedLabel : deriveComplexityLabel(displayScore);
  const levelColor = LEVEL_COLORS[displayLevel] ?? LEVEL_COLORS.L3;

  // ══════ Handlers ══════
  const handleSliderChange = useCallback((paramKey: string, val: number) => {
    setDraft((prev) => ({ ...prev, [paramKey]: val }));
  }, []);

  const handleQuickSelect = useCallback(
    (threshold: (typeof COMPLEXITY_THRESHOLDS)[number]) => {
      const midpoint = Math.max(1, Math.min(10, Math.round((threshold.min + threshold.max) / 2)));
      const newDraft: Record<string, number> = {};
      complexityParams.forEach((p) => {
        newDraft[p.param_key] = midpoint;
      });
      setDraft(newDraft);
      // If override is not on, save immediately
      if (!overrideEnabled) {
        const totalWeight = complexityParams.reduce((s, p) => s + p.weight, 0);
        const ws = totalWeight > 0
          ? complexityParams.reduce((s, p) => s + midpoint * p.weight, 0) / totalWeight
          : 5;
        const score = Math.round(ws * 100) / 100;
        onSave(newDraft, score, threshold.level);
      }
    },
    [complexityParams, overrideEnabled, onSave],
  );

  const handleSave = useCallback(() => {
    onSave(draft, weightedScore, derivedLevel);
  }, [draft, weightedScore, derivedLevel, onSave]);

  const handleCancel = useCallback(() => {
    setDraft(buildDraftFromExisting(currentParams, complexityParams));
    setOverrideEnabled(false);
  }, [currentParams, complexityParams]);

  const handleToggleOverride = useCallback(
    (checked: boolean) => {
      setOverrideEnabled(checked);
      if (checked) {
        // Reset draft to existing values when entering override mode
        setDraft(buildDraftFromExisting(currentParams, complexityParams));
      }
    },
    [currentParams, complexityParams],
  );

  // ══════ Empty state ══════
  if (complexityParams.length === 0) {
    return <p className="text-sm text-muted-foreground">No complexity parameters configured. Contact an admin.</p>;
  }

  // ══════ Render ══════
  return (
    <div className="space-y-4">
      {/* ── Final Complexity Score Badge ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">Final Complexity Score:</span>
        <span className="text-xl font-bold text-primary">{displayScore.toFixed(2)}</span>
        <Badge className={`text-xs border ${levelColor}`}>
          {displayLevel} — {displayLabel}
        </Badge>
      </div>

      {/* ── Quick Override Buttons (always visible) ── */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Quick Override</p>
        <div className="flex flex-wrap gap-2">
          {COMPLEXITY_THRESHOLDS.map((t) => {
            const isActive = displayLevel === t.level;
            return (
              <Button
                key={t.level}
                type="button"
                size="sm"
                variant={isActive ? "default" : "outline"}
                className="text-xs"
                disabled={saving}
                onClick={() => handleQuickSelect(t)}
              >
                {t.level} — {t.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── Override AI Assessment Toggle ── */}
      <div className="flex items-center gap-3 border-t border-border pt-3">
        <Switch
          id="override-complexity"
          checked={overrideEnabled}
          onCheckedChange={handleToggleOverride}
          disabled={saving}
        />
        <label htmlFor="override-complexity" className="text-sm font-medium text-foreground cursor-pointer">
          Override AI Assessment
        </label>
      </div>

      {/* ── Parameter Sliders / Read-only bars ── */}
      <div className="space-y-3">
        {complexityParams.map((param) => {
          const value = draft[param.param_key] ?? 5;
          const barWidth = `${(value / 10) * 100}%`;

          return (
            <div key={param.param_key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">{param.name}</label>
                <span className="text-sm font-semibold text-primary">{value}</span>
              </div>
              {param.description && (
                <p className="text-xs text-muted-foreground">{param.description}</p>
              )}

              {overrideEnabled ? (
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
            </div>
          );
        })}
      </div>

      {/* ── Save / Cancel (only when override is on) ── */}
      {overrideEnabled && (
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

/* ─── Helper: build draft from existing challenge params ─── */

function buildDraftFromExisting(
  existing: ComplexityAssessmentModuleProps["currentParams"],
  masterParams: ComplexityParam[],
): Record<string, number> {
  const draft: Record<string, number> = {};
  if (Array.isArray(existing)) {
    existing.forEach((p) => {
      const key = p.param_key ?? p.key ?? "";
      if (key) draft[key] = Number(p.value ?? p.score ?? 5);
    });
  }
  masterParams.forEach((p) => {
    if (!(p.param_key in draft)) draft[p.param_key] = 5;
  });
  return draft;
}
