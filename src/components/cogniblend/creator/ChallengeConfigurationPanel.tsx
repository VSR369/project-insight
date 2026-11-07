/**
 * ChallengeConfigurationPanel — Phase A: Industry + Governance + Engagement config.
 * Renders horizontal governance cards + engagement model selector above the Creator form.
 */

import { Info, Zap, Layers, Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { creationGovernanceModes, GOVERNANCE_LABELS } from '@/services/cogniblend/creator/governanceSelection';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type GovernanceMode,
} from '@/lib/governanceMode';
import { INDUSTRY_SOURCE_HINT, type IndustrySegmentSource } from '@/constants/industrySegment.constants';

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
  /** How the current segment was resolved — drives the helper subtitle. */
  industrySource?: IndustrySegmentSource | null;
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
  industrySource,
  governanceMode,
  onGovernanceModeChange,
  engagementModel,
  onEngagementModelChange,
  tierCode,
  isEditMode = false,
}: ChallengeConfigurationPanelProps) {
  const availableModes = creationGovernanceModes(tierCode, engagementModel);

  const sourceHint = industrySource ? INDUSTRY_SOURCE_HINT[industrySource] ?? null : null;

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
        {sourceHint && (
          <p className="text-xs text-muted-foreground italic">{sourceHint}</p>
        )}
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
            Governance mode is locked after submission.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" role="group" aria-label="Governance Mode">
          {GOVERNANCE_CARDS.filter(({ mode }) => engagementModel === 'AGG' || mode !== 'QUICK').map(({ mode, icon: Icon, subtitle }) => {
            const isSelected = governanceMode === mode;
            const isUnavailable = !availableModes.includes(mode);
            return (
              <Button key={mode} type="button" variant="outline" disabled={isEditMode || isUnavailable}
                aria-pressed={isSelected} aria-label={GOVERNANCE_LABELS[mode]}
                onClick={() => onGovernanceModeChange(mode)}
                className={cn('relative h-auto min-h-24 whitespace-normal flex-col items-start text-left border-2 p-4',
                  isSelected && 'border-primary bg-accent text-accent-foreground')}>
                <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{GOVERNANCE_LABELS[mode]}</span>
                <span className="text-xs text-muted-foreground">{subtitle}</span>
                {isUnavailable && <Badge variant="secondary">Unavailable on this tier</Badge>}
              </Button>
            );
          })}
        </div>
        {availableModes.length === 0 && <p role="alert" className="text-sm text-destructive">Your subscription has no governance mode available for this engagement model.</p>}

      </div>

      {/* ═══ Engagement Model ═══ */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Engagement Model</h3>
          <p className="text-sm text-muted-foreground">
            How Solution Providers are engaged and who manages the lifecycle.
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
              : 'Marketplace: The platform team manages curation, Solution Provider engagement, evaluation, and award management.'}
          </p>
        </div>
      </div>
    </div>
  );
}
