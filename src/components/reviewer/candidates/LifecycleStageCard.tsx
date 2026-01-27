/**
 * Lifecycle Stage Card
 * 
 * Displays a single lifecycle stage with its status.
 * Visual states: Completed (green), In Progress (amber), Not Started (gray)
 */

import { CheckCircle2, Clock, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { type StageStatus, STAGE_STATUS_DISPLAY } from '@/constants/certification.constants';
import { cn } from '@/lib/utils';

interface LifecycleStageCardProps {
  icon: React.ReactNode;
  title: string;
  status: StageStatus;
  description: string;
  notApplicable?: boolean;
}

export function LifecycleStageCard({
  icon,
  title,
  status,
  description,
  notApplicable = false,
}: LifecycleStageCardProps) {
  const statusConfig = STAGE_STATUS_DISPLAY[status];

  const StatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className={cn('h-5 w-5', statusConfig.iconClass)} />;
      case 'in_progress':
        return <Clock className={cn('h-5 w-5', statusConfig.iconClass)} />;
      default:
        return <Circle className={cn('h-5 w-5', statusConfig.iconClass)} />;
    }
  };

  return (
    <Card className={cn('border transition-colors', statusConfig.bgClass)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <StatusIcon />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Stage Icon */}
              <span className={cn('flex-shrink-0', statusConfig.iconClass)}>
                {icon}
              </span>
              {/* Title */}
              <h4 className={cn('font-medium text-sm truncate', statusConfig.textClass)}>
                {title}
              </h4>
            </div>

            {/* Description */}
            <p className={cn(
              'text-xs',
              status === 'not_started' ? 'text-muted-foreground' : statusConfig.textClass
            )}>
              {description}
              {notApplicable && status === 'completed' && (
                <span className="text-muted-foreground"> (N/A)</span>
              )}
            </p>

            {/* Status Label */}
            <div className="mt-2">
              <span className={cn(
                'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
                status === 'completed' && 'bg-green-100 text-green-700',
                status === 'in_progress' && 'bg-amber-100 text-amber-700',
                status === 'not_started' && 'bg-muted text-muted-foreground'
              )}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
