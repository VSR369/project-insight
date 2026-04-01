/**
 * SectionQualityBadge — Per-section badge (green/yellow/red)
 * showing confidence score + format/contradiction warnings.
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/lib/cogniblend/validators/confidenceScorer';

interface SectionQualityBadgeProps {
  confidenceScore: number | null;
  riskLevel: RiskLevel | null;
  hasFormatWarning?: boolean;
  hasContradiction?: boolean;
  className?: string;
}

export function SectionQualityBadge({
  confidenceScore,
  riskLevel,
  hasFormatWarning = false,
  hasContradiction = false,
  className,
}: SectionQualityBadgeProps) {
  if (confidenceScore === null) return null;

  const badgeClass =
    riskLevel === 'high'
      ? 'bg-destructive/10 text-destructive border-destructive/30'
      : riskLevel === 'medium'
        ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
        : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';

  const warnings: string[] = [];
  if (hasFormatWarning) warnings.push('Format issue detected');
  if (hasContradiction) warnings.push('Cross-section contradiction');
  if (riskLevel === 'high') warnings.push('Low confidence — review carefully');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn('text-[10px] h-4 px-1.5 cursor-help', badgeClass, className)}
        >
          {confidenceScore}%
          {(hasFormatWarning || hasContradiction) && ' ⚠'}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="text-xs font-medium">AI Confidence: {confidenceScore}%</p>
          {warnings.length > 0 && (
            <ul className="text-xs text-muted-foreground list-disc pl-3">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
