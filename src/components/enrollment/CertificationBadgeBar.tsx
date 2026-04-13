/**
 * CertificationBadgeBar
 * 
 * Compact sidebar widget showing resolved certification tier with stars.
 */

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldCheck } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { useResolvedCertification } from '@/hooks/queries/useProviderCertifications';
import { cn } from '@/lib/utils';

interface CertificationBadgeBarProps {
  providerId: string;
  className?: string;
}

export function CertificationBadgeBar({ providerId, className }: CertificationBadgeBarProps) {
  const { data: cert, isLoading, isError } = useResolvedCertification(providerId);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 p-3 rounded-lg bg-muted/30', className)}>
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-16" />
        </div>
      </div>
    );
  }

  // Not certified or error — show uncertified state
  if (isError || !cert || cert.resolved_star_tier === 0) {
    return (
      <div className={cn('flex items-center gap-2 p-3 rounded-lg border bg-card', className)}>
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
          <Shield className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Not Certified</p>
          <p className="text-[10px] text-muted-foreground">Complete enrollment to earn certification</p>
        </div>
      </div>
    );
  }

  const pathLabels = (cert.active_paths ?? []).map(
    (p: string) => p.charAt(0).toUpperCase() + p.slice(1)
  );

  return (
    <div className={cn('flex items-center gap-2 p-3 rounded-lg border bg-card', className)}>
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <ShieldCheck className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold truncate">
            {cert.resolved_cert_label
              ? cert.resolved_cert_label.charAt(0).toUpperCase() + cert.resolved_cert_label.slice(1)
              : 'Certified'}
          </span>
          <StarRating rating={cert.resolved_star_tier} size="sm" />
        </div>
        {pathLabels.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            {pathLabels.map((label: string) => (
              <Badge key={label} variant="secondary" className="text-[8px] px-1 py-0 h-3.5">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
