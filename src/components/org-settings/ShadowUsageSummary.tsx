/**
 * Shadow Usage Summary
 * 
 * Displays shadow (internal) usage metrics for departments
 * that don't pay directly but have tracked usage (BR-SAAS-003).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Eye, TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';

interface ShadowUsageSummaryProps {
  challengesUsed: number;
  challengeLimit: number | null;
  shadowChargePerChallenge: number;
  currencyCode: string;
  periodStart?: string;
  periodEnd?: string;
}

export function ShadowUsageSummary({
  challengesUsed,
  challengeLimit,
  shadowChargePerChallenge,
  currencyCode,
  periodStart,
  periodEnd,
}: ShadowUsageSummaryProps) {
  const { formatDate } = useLocale();

  const usagePercentage = challengeLimit
    ? Math.round((challengesUsed / challengeLimit) * 100)
    : null;

  const shadowTotal = Math.round(challengesUsed * shadowChargePerChallenge * 100) / 100;

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Shadow Usage Summary</CardTitle>
          <Badge variant="secondary" className="ml-auto text-xs">Internal</Badge>
        </div>
        <CardDescription>
          Usage is tracked for transparency but not directly billed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period */}
        {periodStart && periodEnd && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(periodStart)} — {formatDate(periodEnd)}</span>
          </div>
        )}

        {/* Usage bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Challenges Used
            </span>
            <span className="font-medium text-foreground">
              {challengesUsed}{challengeLimit !== null ? ` / ${challengeLimit}` : ''}
            </span>
          </div>
          {usagePercentage !== null && (
            <Progress value={usagePercentage} className="h-2" />
          )}
        </div>

        {/* Shadow cost */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Shadow Cost (tracked only)
          </span>
          <span className="font-semibold text-foreground">
            {currencyCode} {shadowTotal.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
