/**
 * ChallengeConfigurationPanel — Phase A: Industry + Governance + Engagement config.
 * Renders horizontal governance cards + engagement model selector above the Creator form.
 */

import { Info, Zap, Layers, Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAvailableGovernanceModes,
  GOVERNANCE_MODE_CONFIG,
  type GovernanceMode,
} from '@/lib/governanceMode';

/* ─── Governance card metadata ────────────────────────── */

const GOVERNANCE_CARDS: Array<{
  mode: GovernanceMode;
  icon: typeof Zap;
  subtitle: string;
}> = [
  { mode: 'QUICK', icon: Zap, subtitle: '5 fields · Merged roles · Auto-curation' },
  { mode: 'STRUCTURED', icon: Layers, subtitle: '8 fields · Role separation · Manual curation' },
  { mode: 'CONTROLLED', icon: Shield, subtitle: '12 fields · Full separation · Dual gates + escrow' },
];

/* ─── Props ──────────────────────────────────────────── */

interface ChallengeConfigurationPanelProps {
  industrySegmentId: string;
  onIndustrySegmentChange: (id: string) => void;
  industrySegments: Array<{ id: string; name: string }>;
  governanceMode: GovernanceMode;
  onGovernanceModeChange: (mode: GovernanceMode) => void;
  engagementModel: string;
  onEngagementModelChange: (model: string) => void;
  tierCode: string | null;
  /** When true, governance cards are disabled (edit mode) */
  isEditMode?: boolean;
}

/* ─── Component ──────────────────────────────────────── */

export function ChallengeConfigurationPanel({
  industrySegmentId,
  onIndustrySegmentChange,
  industrySegments,
  governanceMode,
  onGovernanceModeChange,
  engagementModel,
  onEngagementModelChange,
  tierCode,
  isEditMode = false,
}: ChallengeConfigurationPanelProps) {
  const availableModes = getAvailableGovernanceModes(tierCode);
  const isSingleMode = availableModes.length <= 1;

  return (
    <div className="space-y-6">
      {/* ═══ Industry Segment ═══ */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Industry Segment</h3>
          <p className="text-sm text-muted-foreground">
            Select the primary industry for this challenge.
          </p>
        </div>
        <Select value={industrySegmentId} onValueChange={onIndustrySegmentChange}>
          <SelectTrigger className="w-full max-w-sm text-base">
            <SelectValue placeholder="Select primary industry" />
          </SelectTrigger>
          <SelectContent>
            {industrySegments.map((seg) => (
              <SelectItem key={seg.id} value={seg.id}>{seg.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ═══ Governance Mode ═══ */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Governance Mode</h3>
          <p className="text-sm text-muted-foreground">
            Controls review rigor, role separation, and compliance requirements.
          </p>
        </div>

        {isEditMode && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Governance mode is locked after creation.
          </div>
        )}

        {isSingleMode && !isEditMode ? (
          /* Single mode — show as non-interactive badge */
          (() => {
            const mode = availableModes[0];
            const cfg = GOVERNANCE_MODE_CONFIG[mode];
            const card = GOVERNANCE_CARDS.find((c) => c.mode === mode)!;
            const Icon = card.icon;
            return (
              <div
                className="flex items-center gap-3 rounded-lg border-2 px-4 py-3 max-w-md"
                style={{ borderColor: cfg.color, backgroundColor: cfg.bg }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cfg.bg, color: cfg.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                </div>
                <Badge variant="secondary" className="text-[9px] ml-auto shrink-0">Only mode</Badge>
              </div>
            );
          })()
        ) : (
          /* Multiple modes — horizontal cards */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GOVERNANCE_CARDS.map(({ mode, icon: Icon, subtitle }) => {
              const cfg = GOVERNANCE_MODE_CONFIG[mode];
              const isSelected = governanceMode === mode;
              const isDisabled = isEditMode || !availableModes.includes(mode);
              const isUnavailable = !availableModes.includes(mode);

              return (
                <button
                  key={mode}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) onGovernanceModeChange(mode);
                  }}
                  className={cn(
                    'relative text-left rounded-lg border-2 px-4 py-3 transition-all',
                    isSelected && !isDisabled && 'bg-primary/5',
                    !isSelected && !isDisabled && 'hover:shadow-sm',
                    isDisabled && 'opacity-40 cursor-not-allowed',
                  )}
                  style={{
                    borderColor: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    backgroundColor: isSelected && !isDisabled ? 'hsl(var(--primary) / 0.06)' : undefined,
                  }}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{subtitle}</p>

                  {/* Selected check */}
                  {isSelected && (
                    <div
                      className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(var(--primary))' }}
                    >
                      <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Upgrade badge */}
                  {isUnavailable && !isEditMode && (
                    <Badge variant="secondary" className="absolute top-2 right-2 text-[9px]">Upgrade</Badge>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Engagement Model ═══ */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Engagement Model</h3>
          <p className="text-sm text-muted-foreground">
            How solvers are engaged and who manages the lifecycle.
          </p>
        </div>
        <Select value={engagementModel} onValueChange={onEngagementModelChange}>
          <SelectTrigger className="w-full max-w-sm">
            <SelectValue placeholder="Select engagement model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MP">Marketplace (MP) — Outsourced</SelectItem>
            <SelectItem value="AGG">Aggregator (AGG) — In-house</SelectItem>
          </SelectContent>
        </Select>
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5 max-w-lg">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {engagementModel === 'AGG'
              ? 'Aggregator: Your organization drives the full lifecycle. You appoint your own Curator, Legal, and Finance coordinators.'
              : 'Marketplace: The platform team manages curation, solver engagement, evaluation, and award management.'}
          </p>
        </div>
      </div>
    </div>
  );
}
