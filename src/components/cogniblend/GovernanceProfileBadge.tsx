/**
 * GovernanceProfileBadge — Reusable governance profile pill with tooltip.
 * Supports 3-mode governance: QUICK (green) | STRUCTURED (blue) | CONTROLLED (purple)
 * Backward-compatible with legacy LIGHTWEIGHT/ENTERPRISE values.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { resolveGovernanceMode, GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';

interface GovernanceProfileBadgeProps {
  profile: string | null | undefined;
  /** Render at a smaller size (for sidebars, compact areas) */
  compact?: boolean;
}

export function GovernanceProfileBadge({ profile, compact = false }: GovernanceProfileBadgeProps) {
  const mode = resolveGovernanceMode(profile);
  const cfg = GOVERNANCE_MODE_CONFIG[mode];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="inline-block font-bold whitespace-nowrap cursor-default select-none"
            style={{
              fontSize: compact ? 10 : 14,
              padding: compact ? '2px 8px' : '4px 16px',
              borderRadius: 999,
              backgroundColor: cfg.bg,
              color: cfg.color,
              lineHeight: 1.4,
            }}
          >
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[260px] text-xs">
          {cfg.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
