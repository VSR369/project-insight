import { Badge } from '@/components/ui/badge';

interface SLAStatusBadgeProps {
  breachTier: string;
}

/**
 * Shows SLA breach tier badge. Hidden when NONE.
 * GAP-9: Emoji/icon indicators per spec
 */
export function SLAStatusBadge({ breachTier }: SLAStatusBadgeProps) {
  if (!breachTier || breachTier === 'NONE') return null;

  const variants: Record<string, { label: string; className: string }> = {
    TIER1: { label: '⚠ T1', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    TIER2: { label: '🔴 T2', className: 'bg-red-100 text-red-800 border-red-300' },
    TIER3: { label: '🚨 T3 CRITICAL', className: 'bg-red-900 text-white border-red-900' },
  };

  const v = variants[breachTier] ?? variants.TIER1;

  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}
