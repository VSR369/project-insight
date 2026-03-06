import { Badge } from '@/components/ui/badge';

interface SLAStatusBadgeProps {
  breachTier: string;
}

/**
 * Shows SLA breach tier badge. Hidden when NONE.
 */
export function SLAStatusBadge({ breachTier }: SLAStatusBadgeProps) {
  if (!breachTier || breachTier === 'NONE') return null;

  const variants: Record<string, { label: string; className: string }> = {
    TIER1: { label: 'SLA Warning', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    TIER2: { label: 'SLA Breached', className: 'bg-red-100 text-red-800 border-red-300' },
    TIER3: { label: 'CRITICAL', className: 'bg-red-900 text-white border-red-900' },
  };

  const v = variants[breachTier] ?? variants.TIER1;

  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}
