/**
 * CertificationPathSelector — For providers at 100% profile,
 * shows 3 certification path options (Experience, Performance, VIP).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CERTIFICATION_PATHS } from '@/constants/enrollment.constants';
import { Award, TrendingUp, Crown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CertificationPathSelectorProps {
  providerId: string;
  isVip?: boolean;
  onSelectPath: (path: string) => void;
  className?: string;
}

const PATH_ICONS: Record<string, React.ReactNode> = {
  experience: <Award className="h-8 w-8 text-primary" />,
  performance: <TrendingUp className="h-8 w-8 text-accent-foreground" />,
  vip: <Crown className="h-8 w-8 text-amber-500" />,
};

const PATH_DETAILS: Record<string, { steps: string[]; timeframe: string }> = {
  experience: {
    steps: ['Complete enrollment wizard', 'Pass industry assessment', 'Interview with panel'],
    timeframe: '2-4 weeks',
  },
  performance: {
    steps: ['Submit solutions to challenges', 'Build composite score', 'Auto-certify at threshold'],
    timeframe: 'Ongoing',
  },
  vip: {
    steps: ['Accept VIP invitation', 'Verify credentials', 'Instant Eminent certification'],
    timeframe: 'Immediate',
  },
};

export function CertificationPathSelector({
  isVip = false,
  onSelectPath,
  className,
}: CertificationPathSelectorProps) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-4', className)}>
      {CERTIFICATION_PATHS.map((path) => {
        const details = PATH_DETAILS[path.value];
        const isVipPath = path.value === 'vip';
        const disabled = isVipPath && !isVip;

        return (
          <Card
            key={path.value}
            className={cn(
              'relative transition-shadow hover:shadow-md',
              disabled && 'opacity-50 pointer-events-none',
              isVipPath && isVip && 'border-amber-400 ring-1 ring-amber-200'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {PATH_ICONS[path.value]}
                <div>
                  <CardTitle className="text-base">{path.label}</CardTitle>
                  {isVipPath && isVip && (
                    <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800">
                      You're invited
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{path.description}</p>
              <ul className="space-y-1.5">
                {details.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Timeframe: <span className="font-medium">{details.timeframe}</span>
              </p>
              <Button
                size="sm"
                variant={isVipPath && isVip ? 'default' : 'outline'}
                className="w-full"
                onClick={() => onSelectPath(path.value)}
                disabled={disabled}
              >
                Choose this path
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
