/**
 * ApprovalTierGroup — Collapsible tier group wrapping ApprovalSectionCards.
 */

import { useState } from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ApprovalTier } from '@/lib/cogniblend/approvalTiers';
import type { TierSection } from '@/hooks/cogniblend/useApprovalTiers';
import { ApprovalSectionCard } from './ApprovalSectionCard';

interface ApprovalTierGroupProps {
  tier: ApprovalTier;
  sections: TierSection[];
  approvedCount: number;
  totalCount: number;
  onApprove: (key: string) => void;
  onRequestChange: (key: string, comment: string) => void;
  isControlled: boolean;
  defaultExpanded: boolean;
}

export function ApprovalTierGroup({
  tier, sections, approvedCount, totalCount,
  onApprove, onRequestChange, isControlled, defaultExpanded,
}: ApprovalTierGroupProps) {
  const [open, setOpen] = useState(defaultExpanded);
  const allApproved = approvedCount === totalCount && totalCount > 0;

  if (sections.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{tier.label}</span>
              {tier.id === 'ai_generated' && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> AI handled these
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{tier.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium',
              allApproved ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : '',
            )}
          >
            {approvedCount}/{totalCount}
          </Badge>
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-2 pt-2 pl-2">
          {sections.map((s) => (
            <ApprovalSectionCard
              key={s.key}
              sectionKey={s.key}
              label={s.label}
              curatorContent={s.curatorContent}
              creatorContent={s.creatorContent}
              approvalStatus={s.approvalStatus}
              onApprove={() => onApprove(s.key)}
              onRequestChange={(comment) => onRequestChange(s.key, comment)}
              isControlled={isControlled}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
