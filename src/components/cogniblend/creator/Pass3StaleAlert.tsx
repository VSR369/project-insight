/**
 * Pass3StaleAlert — Warning shown when Creator edits invalidate Pass 3.
 *
 * Used in two places:
 *  1. Creator review page (informational — explains why their edits matter).
 *  2. Curator/LC Pass 3 panels (actionable — prompts re-run).
 */
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface Pass3StaleAlertProps {
  /** Override the default description (e.g. for Curator/LC panels). */
  description?: string;
}

export function Pass3StaleAlert({ description }: Pass3StaleAlertProps) {
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-200">
        Legal documents need re-review
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        {description ??
          'Your edits have changed the challenge content. The legal documents will be automatically updated by the Curator before publication.'}
      </AlertDescription>
    </Alert>
  );
}

export default Pass3StaleAlert;
