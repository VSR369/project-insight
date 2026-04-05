/**
 * ChallengeConfigurationPanel — Phase A: Industry + Governance + Engagement config.
 * Renders as 3 card sections above the Creator form.
 */

import { Info } from 'lucide-react';
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

const GOVERNANCE_DESCRIPTIONS: Record<GovernanceMode, { headline: string; body: string; bestFor: string }> = {
  QUICK: {
    headline: 'Express — publish in minutes',
    body: 'You fill 5 essential fields, AI generates the rest. One person handles everything.',
    bestFor: 'Hackathons, student contests, quick experiments',
  },
  STRUCTURED: {
    headline: 'Professional — Curator enriches your challenge',
    body: 'You fill 8 fields. A human Curator reviews and enriches your brief with AI assistance.',
    bestFor: 'R&D challenges, funded initiatives ($25K–$100K)',
  },
  CONTROLLED: {
    headline: 'Enterprise compliance — full audit trail',
    body: 'You fill 12 fields with mandatory AI quality review. Separate Legal and Financial coordinators.',
    bestFor: 'Pharma, defense, financial services ($100K+)',
  },
};

interface ChallengeConfigurationPanelProps {
  industrySegmentId: string;
  onIndustrySegmentChange: (id: string) => void;
  industrySegments: Array<{ id: string; name: string }>;
  governanceMode: GovernanceMode;
  onGovernanceModeChange: (mode: GovernanceMode) => void;
  engagementModel: string;
  onEngagementModelChange: (model: string) => void;
  tierCode: string | null;
}

export function ChallengeConfigurationPanel({
  industrySegmentId,
  onIndustrySegmentChange,
  industrySegments,
  governanceMode,
  onGovernanceModeChange,
  engagementModel,
  onEngagementModelChange,
  tierCode,
}: ChallengeConfigurationPanelProps) {
  const availableModes = getAvailableGovernanceModes(tierCode);
  const isLocked = availableModes.length <= 1;
  const cfg = GOVERNANCE_MODE_CONFIG[governanceMode];
  const govDesc = GOVERNANCE_DESCRIPTIONS[governanceMode];

  return (
    <div className="space-y-6">
      {/* Industry Segment */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Industry Segment</h3>
          <p className="text-sm text-muted-foreground">
            Select the primary industry for this challenge. Determines solver matching, AI context, and discovery categorization.
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

      {/* Governance Mode */}
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-bold text-foreground mb-1">Governance Mode</h3>
          <p className="text-sm text-muted-foreground">
            Controls review rigor, role separation, and compliance requirements.
          </p>
        </div>
        {isLocked ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your tier uses{' '}
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>{' '}
              governance. Upgrade to access additional modes.
            </p>
          </div>
        ) : (
          <Select value={governanceMode} onValueChange={(v) => onGovernanceModeChange(v as GovernanceMode)}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableModes.map((mode) => {
                const mc = GOVERNANCE_MODE_CONFIG[mode];
                return (
                  <SelectItem key={mode} value={mode}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: mc.color }} />
                      {mc.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}
        <div className="rounded-lg border border-border bg-muted/30 p-3 max-w-sm">
          <p className="text-sm font-medium text-foreground mb-0.5">{govDesc.headline}</p>
          <p className="text-xs text-muted-foreground">{govDesc.body}</p>
          <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Best for:</span> {govDesc.bestFor}</p>
        </div>
      </div>

      {/* Engagement Model */}
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
        <div className="rounded-lg border border-border bg-muted/30 p-4 max-w-lg">
          {engagementModel === 'AGG' ? (
            <>
              <p className="text-sm font-medium text-foreground mb-1">Aggregator — In-house Innovation Management</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your organization drives the full challenge lifecycle using the platform as a tool.
                You appoint your own Curator, Legal Coordinator, and Finance Coordinator.
                <span className="font-medium text-foreground"> Like insourcing with access to a global solver pool.</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground mb-1">Marketplace — Outsourced Innovation Management</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The platform team takes full responsibility for the challenge lifecycle — curation, solver engagement,
                evaluation, and award management. You focus on defining the problem and funding the prize.
                <span className="font-medium text-foreground"> Like outsourcing to innovation experts.</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
