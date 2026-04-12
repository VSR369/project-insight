/**
 * ChallengeConfigSummary — Configuration summary card + governance-specific explanation banners.
 */

import { Zap, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { GovernanceMode } from '@/lib/governanceMode';
import { governanceLabel } from '@/lib/cogniblend/displayHelpers';

interface ChallengeConfigSummaryProps {
  effectiveGovernance: GovernanceMode;
  operatingModel: string | null;
  rewardStructure: Record<string, unknown> | null;
  currencyCode: string | null;
  industryName: string | null;
  domainTags: unknown[] | null;
  currentPhase: number | null;
}

export function ChallengeConfigSummary({
  effectiveGovernance,
  operatingModel,
  rewardStructure,
  currencyCode,
  industryName,
  domainTags,
  currentPhase,
}: ChallengeConfigSummaryProps) {
  const isQuick = effectiveGovernance === 'QUICK';
  const rs = rewardStructure ?? {};
  const prize = Number((rs as Record<string, unknown>).platinum_award ?? (rs as Record<string, unknown>).budget_max ?? 0);
  const curr = currencyCode || ((rs as Record<string, unknown>).currency as string) || 'USD';
  const tags = (domainTags as string[]) ?? [];

  return (
    <div className="space-y-3">
      {/* ═══ CONFIGURATION SUMMARY ═══ */}
      <div className="rounded-xl border border-border bg-muted/10 p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Governance</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-xs font-semibold">
                {governanceLabel(effectiveGovernance)}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Engagement</p>
            <p className="text-sm font-medium text-foreground mt-1">
              {operatingModel === 'MP' ? 'Marketplace' : 'Aggregator'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {operatingModel === 'MP' ? 'Platform manages lifecycle' : 'Your team manages lifecycle'}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Top Prize</p>
            {prize > 0 ? (
              <p className="text-lg font-bold text-foreground mt-0.5">
                {curr} {prize.toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Not set</p>
            )}
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Industry</p>
            <p className="text-sm font-medium text-foreground mt-1">{industryName || 'Not set'}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.slice(0, 3).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{String(tag)}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ GOVERNANCE-SPECIFIC BANNERS ═══ */}
      {isQuick && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 flex items-start gap-2.5">
          <Zap className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
             <p className="text-sm font-medium text-emerald-800">Express Mode — Direct to Solution Providers</p>
             <p className="text-xs text-emerald-700 mt-0.5">
               {operatingModel === 'AGG'
                 ? 'This challenge was published directly to matching Solution Providers in your organization\'s network. No separate Curator or legal review — platform defaults applied automatically.'
                 : 'This challenge was published on the open marketplace. All qualified Solution Providers can discover, enroll, and submit solutions. The platform team manages Solution Provider engagement.'}
            </p>
          </div>
        </div>
      )}

      {!isQuick && (currentPhase ?? 1) >= 2 && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {effectiveGovernance === 'CONTROLLED' ? 'Controlled Review Pipeline' : 'Professional Review'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {effectiveGovernance === 'CONTROLLED'
                 ? 'Your challenge goes through: Curator review (advisory AI review) → Legal Coordinator review → Financial Coordinator escrow deposit → Publication to Solution Providers.'
                 : 'Your challenge goes through: Curator review (includes legal & fee verification) → Publication to Solution Providers.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
