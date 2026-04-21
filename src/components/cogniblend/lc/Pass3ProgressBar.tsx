/**
 * Pass3ProgressBar — indeterminate progress with status sub-line.
 * Shown while a Pass 3 regenerate (full or organize-only) is running.
 */
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface Pass3ProgressBarProps {
  isRunning: boolean;
  isOrganizing: boolean;
}

export function Pass3ProgressBar({ isRunning, isOrganizing }: Pass3ProgressBarProps) {
  if (!isRunning && !isOrganizing) return null;
  const label = isOrganizing
    ? 'Organizing & merging source documents…'
    : 'AI is enhancing the unified agreement…';
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{label}</span>
      </div>
      <Progress value={undefined} className="h-1.5 animate-pulse" />
      <p className="text-xs text-muted-foreground">
        This usually takes 10–30 seconds. Please don't navigate away.
      </p>
    </div>
  );
}

export default Pass3ProgressBar;
