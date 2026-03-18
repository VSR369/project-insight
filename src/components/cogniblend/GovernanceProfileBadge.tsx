/**
 * GovernanceProfileBadge — Reusable governance profile pill with tooltip.
 * LIGHTWEIGHT = green pill | ENTERPRISE = blue pill
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface GovernanceProfileBadgeProps {
  profile: string | null | undefined;
  /** Render at a smaller size (for sidebars, compact areas) */
  compact?: boolean;
}

const CONFIG = {
  LIGHTWEIGHT: {
    label: 'LIGHTWEIGHT',
    bg: '#E1F5EE',
    color: '#0F6E56',
    tooltip: 'Lightweight: simplified workflow with auto-completion',
  },
  ENTERPRISE: {
    label: 'ENTERPRISE',
    bg: '#E6F1FB',
    color: '#185FA5',
    tooltip: 'Enterprise: full governance with all phases and approvals',
  },
} as const;

export function GovernanceProfileBadge({ profile, compact = false }: GovernanceProfileBadgeProps) {
  const key = profile === 'ENTERPRISE' ? 'ENTERPRISE' : 'LIGHTWEIGHT';
  const cfg = CONFIG[key];

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
