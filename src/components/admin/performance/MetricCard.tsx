import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function MetricCard({ label, value, subtitle, icon: Icon, trend, className }: MetricCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs lg:text-sm text-muted-foreground font-medium">{label}</p>
            <p className={cn(
              'text-xl lg:text-2xl font-bold',
              trend === 'positive' && 'text-green-600 dark:text-green-400',
              trend === 'negative' && 'text-destructive',
              trend === 'neutral' && 'text-foreground',
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="rounded-lg bg-muted p-2">
            <Icon className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
