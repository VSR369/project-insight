/**
 * Org Type Info Banner (REG-001)
 * 
 * Shows contextual info based on selected org type:
 * - Tier recommendation
 * - Subsidized eligibility
 * - Startup eligibility hint
 * - Compliance requirements
 */

import type { OrgTypeFlags } from '@/types/registration';
import { Info, ShieldCheck, Sparkles, BadgePercent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgTypeInfoBannerProps {
  flags: OrgTypeFlags;
  className?: string;
}

export function OrgTypeInfoBanner({ flags, className }: OrgTypeInfoBannerProps) {
  const items: { icon: React.ReactNode; text: string; variant: string }[] = [];

  if (flags.tier_recommendation) {
    items.push({
      icon: <Sparkles className="h-4 w-4" />,
      text: `Recommended tier: ${flags.tier_recommendation}`,
      variant: 'primary',
    });
  }

  if (flags.subsidized_eligible) {
    items.push({
      icon: <BadgePercent className="h-4 w-4" />,
      text: `Eligible for subsidized pricing${flags.subsidized_discount_pct ? ` (${flags.subsidized_discount_pct}% discount)` : ''}`,
      variant: 'success',
    });
  }

  if (flags.compliance_required) {
    items.push({
      icon: <ShieldCheck className="h-4 w-4" />,
      text: 'Compliance documentation will be required in Step 3',
      variant: 'info',
    });
  }

  if (flags.startup_eligible) {
    items.push({
      icon: <Info className="h-4 w-4" />,
      text: 'May qualify for startup program benefits',
      variant: 'info',
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-2 text-sm rounded-md px-3 py-2 bg-muted/50 text-muted-foreground"
        >
          {item.icon}
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}
