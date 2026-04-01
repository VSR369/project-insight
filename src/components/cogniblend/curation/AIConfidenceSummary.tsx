/**
 * AIConfidenceSummary — Right-rail card showing per-section confidence badges.
 * High-risk sections displayed first.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreConfidence, type RiskLevel } from '@/lib/cogniblend/validators/confidenceScorer';
import type { ChallengeContext } from '@/lib/cogniblend/challengeContextAssembler';

interface AIConfidenceSummaryProps {
  sectionKeys: string[];
  /** Accepts full ChallengeContext or a partial context object */
  context: ChallengeContext | Record<string, unknown> | null;
  className?: string;
}

const RISK_CONFIG: Record<RiskLevel, { icon: typeof Shield; label: string; className: string }> = {
  high: { icon: AlertTriangle, label: 'High Risk', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  medium: { icon: Shield, label: 'Medium', className: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  low: { icon: CheckCircle2, label: 'Low Risk', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
};

export function AIConfidenceSummary({ sectionKeys, context, className }: AIConfidenceSummaryProps) {
  const scores = useMemo(() => {
    if (!context) return [];
    return sectionKeys
      .map((key) => ({
        key,
        ...scoreConfidence(key, context),
      }))
      .sort((a, b) => a.score - b.score); // lowest confidence first
  }, [sectionKeys, context]);

  if (!context || scores.length === 0) return null;

  const avgScore = Math.round(scores.reduce((s, r) => s + r.score, 0) / scores.length);
  const highRiskCount = scores.filter((s) => s.riskLevel === 'high').length;

  return (
    <Card className={cn('border-border', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          AI Confidence
          <Badge variant="secondary" className="ml-auto text-xs">
            {avgScore}%
          </Badge>
        </CardTitle>
        {highRiskCount > 0 && (
          <p className="text-xs text-amber-600">
            {highRiskCount} section{highRiskCount !== 1 ? 's' : ''} need extra review
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-1.5">
        {scores.slice(0, 8).map(({ key, score, riskLevel }) => {
          const config = RISK_CONFIG[riskLevel];
          const Icon = config.icon;
          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <Icon className={cn('h-3 w-3 shrink-0', riskLevel === 'high' ? 'text-destructive' : riskLevel === 'medium' ? 'text-amber-600' : 'text-emerald-600')} />
              <span className="flex-1 truncate capitalize">{key.replace(/_/g, ' ')}</span>
              <Badge variant="outline" className={cn('text-[10px] h-4 px-1.5', config.className)}>
                {score}%
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
