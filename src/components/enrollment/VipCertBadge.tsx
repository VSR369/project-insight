/**
 * VipCertBadge — VIP-specific certification badge variant.
 * Shows the VIP Expert designation with Eminent (3-star) styling.
 */

import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface VipCertBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function VipCertBadge({ className, showLabel = true }: VipCertBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'gap-1 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        className,
      )}
    >
      <Crown className="h-3 w-3" />
      {showLabel && 'VIP Expert'} ⭐⭐⭐
    </Badge>
  );
}
