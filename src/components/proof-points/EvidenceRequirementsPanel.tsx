import { Card, CardContent } from '@/components/ui/card';
import { 
  ClipboardList, 
  Info, 
  CheckCircle2,
  Circle,
  Calendar
} from 'lucide-react';

interface EvidenceRequirementsPanelProps {
  currentCount: number;
  minimumRequired?: number;
  showLookAhead?: boolean;
  className?: string;
}

export function EvidenceRequirementsPanel({
  currentCount,
  minimumRequired = 2,
  showLookAhead = true,
  className = '',
}: EvidenceRequirementsPanelProps) {
  const remaining = Math.max(0, minimumRequired - currentCount);
  const minimumMet = currentCount >= minimumRequired;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Evidence Step Requirements */}
      <Card 
        className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 animate-fade-in"
        style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex gap-3">
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Evidence Step Requirements</h3>
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Proof Points Required:</span>{' '}
                  You need at least {minimumRequired} proof points to continue to Share Knowledge.
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Current Status:</span>{' '}
                  You currently have{' '}
                  <span className={minimumMet ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                    {currentCount} proof point{currentCount !== 1 ? 's' : ''}
                  </span>.
                </p>
                {!minimumMet && (
                  <p className="text-blue-600 dark:text-blue-400 font-medium">
                    Add {remaining} more to unlock the next step.
                  </p>
                )}
                {minimumMet && (
                  <p className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    You've met the minimum requirement!
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Looking Ahead Panel */}
      {showLookAhead && (
        <Card 
          className="border-muted animate-fade-in"
          style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex gap-3">
              <div className="shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Info className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Looking Ahead: Meeting Scheduling Requirements</h3>
                <p className="text-sm text-muted-foreground">
                  After completing the Share Knowledge assessment, you'll need 3 proof points total and test approval to schedule meetings with our platform specialists.
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    {currentCount >= 3 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={currentCount >= 3 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                      3+ Proof Points ({currentCount}/3)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assessment Approval (Pending)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Schedule Meeting</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
