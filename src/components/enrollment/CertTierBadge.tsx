/**
 * CertTierBadge — Compact certification badge for provider cards/lists.
 * Shows resolved star tier + label from vw_provider_resolved_cert.
 */

import { Shield, ShieldCheck, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useResolvedCertification } from '@/hooks/queries/useProviderCertifications';
import { cn } from '@/lib/utils';

interface CertTierBadgeProps {
  providerId: string;
  className?: string;
  /** Show inline (no query) when cert data is already available */
  staticTier?: number;
  staticLabel?: string;
}

const TIER_CONFIG: Record<number, { icon: typeof Shield; label: string; className: string }> = {
  1: { icon: ShieldCheck, label: 'Proven', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  2: { icon: ShieldCheck, label: 'Acclaimed', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  3: { icon: Crown, label: 'Eminent', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
};

export function CertTierBadge({ providerId, className, staticTier, staticLabel }: CertTierBadgeProps) {
  const { data: cert, isLoading } = useResolvedCertification(
    staticTier !== undefined ? undefined : providerId,
  );

  const tier = staticTier ?? cert?.resolved_star_tier ?? 0;
  const label = staticLabel ?? cert?.resolved_cert_label ?? null;

  if (isLoading && staticTier === undefined) {
    return <Skeleton className="h-5 w-16" />;
  }

  if (tier === 0) return null;

  const config = TIER_CONFIG[tier];
  if (!config) return null;

  const Icon = config.icon;
  const stars = '⭐'.repeat(tier);

  return (
    <Badge variant="secondary" className={cn('gap-1 text-xs font-medium', config.className, className)}>
      <Icon className="h-3 w-3" />
      {label ?? config.label} {stars}
    </Badge>
  );
}
