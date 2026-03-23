/**
 * CreationContextBar — Horizontal context bar showing Org, Governance Mode,
 * Engagement Model, and Subscription Tier badges.
 */

import { Building2, Shield, Network, Gem } from 'lucide-react';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';
import { useOrgModelContext } from '@/hooks/queries/useSolutionRequestContext';
import {
  getDefaultGovernanceMode,
  GOVERNANCE_MODE_CONFIG,
} from '@/lib/governanceMode';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface ContextBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg?: string;
  color?: string;
  tooltip?: string;
}

function ContextBadge({ icon, label, value, bg, color, tooltip }: ContextBadgeProps) {
  const badge = (
    <div
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors"
      style={{
        backgroundColor: bg ?? 'hsl(var(--muted))',
        color: color ?? 'hsl(var(--muted-foreground))',
        borderColor: color ? `${color}33` : 'hsl(var(--border))',
      }}
    >
      {icon}
      <span className="hidden sm:inline text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );

  if (!tooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-[240px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function CreationContextBar() {
  const { data: currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const { data: orgContext, isLoading: modelLoading } = useOrgModelContext();

  if (orgLoading || modelLoading) {
    return (
      <div className="flex items-center gap-2 px-1">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-7 w-16" />
      </div>
    );
  }

  if (!currentOrg) return null;

  const govMode = getDefaultGovernanceMode(currentOrg.tierCode, currentOrg.governanceProfile);
  const govConfig = GOVERNANCE_MODE_CONFIG[govMode];
  const modelLabel = orgContext?.operatingModel === 'MP' ? 'Marketplace' : orgContext?.operatingModel === 'AGG' ? 'Aggregator' : '—';
  const tierLabel = (currentOrg.tierCode ?? 'Basic').charAt(0).toUpperCase() + (currentOrg.tierCode ?? 'basic').slice(1).toLowerCase();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap items-center gap-2">
        <ContextBadge
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Org"
          value={currentOrg.orgName}
          tooltip="Your organization context"
        />
        <ContextBadge
          icon={<Shield className="h-3.5 w-3.5" />}
          label="Governance"
          value={govConfig.label}
          bg={govConfig.bg}
          color={govConfig.color}
          tooltip={govConfig.tooltip}
        />
        <ContextBadge
          icon={<Network className="h-3.5 w-3.5" />}
          label="Model"
          value={modelLabel}
          tooltip={orgContext?.operatingModel === 'MP'
            ? 'Marketplace: seekers engage solution providers directly'
            : 'Aggregator: platform aggregates and curates challenges'}
        />
        <ContextBadge
          icon={<Gem className="h-3.5 w-3.5" />}
          label="Tier"
          value={tierLabel}
          tooltip={`Subscription tier: ${tierLabel}`}
        />
      </div>
    </TooltipProvider>
  );
}
