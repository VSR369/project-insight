/**
 * GovernanceProfileTab — Displays the current governance mode (read-only).
 * Governance mode is configured by the Platform Supervisor via master data.
 *
 * Shows the 3-mode badge (QUICK/STRUCTURED/CONTROLLED) with descriptions.
 */

import { ShieldCheck, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GovernanceProfileBadge } from '@/components/cogniblend/GovernanceProfileBadge';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { resolveGovernanceMode, GOVERNANCE_MODE_CONFIG, type GovernanceMode } from '@/lib/governanceMode';

interface GovernanceProfileTabProps {
  organizationId: string;
}

const MODE_DESCRIPTIONS: Record<GovernanceMode, { title: string; features: string[] }> = {
  QUICK: {
    title: 'Quick — Simplified Workflow',
    features: [
      'Auto-completed review phases for faster time to publish',
      'Merged curator/approver roles reduce handoffs',
      'Fewer mandatory fields — only essentials required',
      'Ideal for straightforward challenges with clear scope',
    ],
  },
  STRUCTURED: {
    title: 'Structured — Balanced Governance',
    features: [
      'Manual curation with full 14-point quality checklist',
      'Separate role assignments for each challenge phase',
      'Weighted screening with optional anonymous evaluation',
      'Full legal document suite attached to every challenge',
    ],
  },
  CONTROLLED: {
    title: 'Controlled — Full Compliance',
    features: [
      'All 13 lifecycle phases active with mandatory gate enforcement',
      'Mandatory escrow funding before publication',
      'Material amendment governance with withdrawal windows',
      '3-tier access model: Organization → Challenge → Phase-level',
      'All 60 parameters required for complete specification',
    ],
  },
};

export function GovernanceProfileTab({ organizationId }: GovernanceProfileTabProps) {
  const { data: currentOrg } = useCurrentOrg();

  const rawProfile = (currentOrg as any)?.governanceProfile ?? 'LIGHTWEIGHT';
  const mode = resolveGovernanceMode(rawProfile);
  const modeConfig = GOVERNANCE_MODE_CONFIG[mode];
  const modeDesc = MODE_DESCRIPTIONS[mode];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Governance Profile
        </CardTitle>
        <CardDescription>
          Controls how challenges are structured, reviewed, and governed within your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current profile badge — large */}
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium text-muted-foreground">Current Mode</span>
          <GovernanceProfileBadge profile={rawProfile} />
        </div>

        {/* Mode description */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">{modeDesc.title}</h3>
          <ul className="space-y-2">
            {modeDesc.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span
                  className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: modeConfig.color }}
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* All 3 modes at a glance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {(['QUICK', 'STRUCTURED', 'CONTROLLED'] as GovernanceMode[]).map((m) => {
            const cfg = GOVERNANCE_MODE_CONFIG[m];
            const isActive = m === mode;
            return (
              <div
                key={m}
                className={`rounded-lg border p-3 transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card opacity-60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                  {isActive && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-auto">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {cfg.tooltip}
                </p>
              </div>
            );
          })}
        </div>

        {/* Supervisor notice */}
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 p-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Governance mode is managed by your Platform Supervisor and configured based on your
            subscription tier. Contact your supervisor to request a mode change.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
