/**
 * ComplexitySubComponents — Tab card selector and tab content panels
 * extracted from ComplexityAssessmentModule.
 */

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Bot, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplexityParam } from "@/hooks/queries/useComplexityParams";
import {
  COMPLEXITY_THRESHOLDS,
  LEVEL_CARD_COLORS,
} from "@/lib/cogniblend/complexityScoring";

/* ─── TabCard ─── */

export function TabCard({
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

/* ─── AIReviewTab ─── */

export function AIReviewTab({
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
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">Complexity Score:</span>
        <span className="text-xl font-bold text-primary">{displayScore.toFixed(2)}</span>
        <Badge className={`text-xs border ${levelColor}`}>
          {displayLevel} — {displayLabel}
        </Badge>
      </div>

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

/* ─── ManualParamsTab ─── */

export function ManualParamsTab({
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
  aiScoreRef,
  aiLevelRef,
  aiLabelRef,
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
  aiScoreRef?: number | null;
  aiLevelRef?: string | null;
  aiLabelRef?: string | null;
}) {
  return (
    <div className="space-y-4">
      {aiScoreRef != null && aiLevelRef && aiLabelRef && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bot className="h-3 w-3" />
          <span>AI recommended: {aiScoreRef.toFixed(2)} ({aiLevelRef} — {aiLabelRef})</span>
        </div>
      )}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-foreground">Weighted Score:</span>
        <span className="text-xl font-bold text-primary">{weightedScore.toFixed(2)}</span>
        <Badge className={`text-xs border ${levelColor}`}>
          {derivedLevel} — {derivedLabel}
        </Badge>
      </div>

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

/* ─── QuickSelectTab ─── */

export function QuickSelectTab({
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

export function buildDraftFromExisting(
  existing: { param_key?: string; key?: string; name?: string; value?: number; score?: number; _meta?: any }[] | null,
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
