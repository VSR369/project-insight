/**
 * Pass3ReviewHeader — Status strip + AI summary + confidence/regulatory chips.
 * Extracted from LcPass3ReviewPanel to keep that file ≤ 250 lines (R1).
 */
import { Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Pass3StatusStrip, type Pass3StatusKind } from '@/components/cogniblend/lc/Pass3StatusStrip';
import type { Pass3Confidence } from '@/hooks/cogniblend/useLcPass3Review';
import { cn } from '@/lib/utils';

const CONFIDENCE_VARIANT: Record<
  NonNullable<Pass3Confidence>,
  { label: string; className: string }
> = {
  high: { label: 'High confidence', className: 'bg-success/10 text-success border-success/30' },
  medium: { label: 'Medium confidence', className: 'bg-warning/10 text-warning border-warning/30' },
  low: { label: 'Low confidence', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export interface Pass3ReviewHeaderProps {
  status: Pass3StatusKind;
  runCount: number;
  reviewedAt: string | null;
  isStale: boolean;
  isBusy: boolean;
  isDirty?: boolean;
  changesSummary: string;
  confidence: Pass3Confidence;
  regulatoryFlags: string[];
  onRerunAi: () => void;
  onReorganize: () => void;
}

export function Pass3ReviewHeader({
  status,
  runCount,
  reviewedAt,
  isStale,
  isBusy,
  isDirty = false,
  changesSummary,
  confidence,
  regulatoryFlags,
  onRerunAi,
  onReorganize,
}: Pass3ReviewHeaderProps) {
  return (
    <>
      <Pass3StatusStrip
        status={status}
        runCount={runCount}
        reviewedAt={reviewedAt}
        isStale={isStale}
        onRerunAi={onRerunAi}
        onReorganize={onReorganize}
        isBusy={isBusy}
        isDirty={isDirty}
      />

      {changesSummary && (
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Summary
          </AlertTitle>
          <AlertDescription className="whitespace-pre-wrap text-sm">
            {changesSummary}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {confidence && (
          <Badge
            variant="outline"
            className={cn('font-medium', CONFIDENCE_VARIANT[confidence].className)}
          >
            {CONFIDENCE_VARIANT[confidence].label}
          </Badge>
        )}
        {regulatoryFlags.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">Regulatory flags:</span>
            {regulatoryFlags.map((flag) => (
              <Badge key={flag} variant="secondary">
                {flag}
              </Badge>
            ))}
          </>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          Run #{runCount}
        </span>
      </div>
    </>
  );
}

export default Pass3ReviewHeader;
