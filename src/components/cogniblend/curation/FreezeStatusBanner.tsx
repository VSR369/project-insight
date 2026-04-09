/**
 * FreezeStatusBanner — Shows curation lock status (OPEN / FROZEN / RETURNED).
 */
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

interface FreezeStatusBannerProps {
  lockStatus: string;
  frozenAt?: string | null;
}

export function FreezeStatusBanner({ lockStatus, frozenAt }: FreezeStatusBannerProps) {
  if (lockStatus === 'OPEN') return null;

  if (lockStatus === 'FROZEN') {
    return (
      <Alert className="border-blue-500/30 bg-blue-50 dark:bg-blue-900/20">
        <Lock className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-300 flex items-center gap-2">
          Content Frozen
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300">
            FROZEN
          </Badge>
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
          Challenge content is locked for legal review. Content fields cannot be edited.
          {frozenAt && (
            <span className="block mt-1 text-xs text-blue-600 dark:text-blue-500">
              Frozen at: {new Date(frozenAt).toLocaleString()}
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (lockStatus === 'RETURNED') {
    return (
      <Alert className="border-amber-500/30 bg-amber-50 dark:bg-amber-900/20">
        <RotateCcw className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-300 flex items-center gap-2">
          Returned for Re-curation
          <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300">
            RETURNED
          </Badge>
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400 text-sm">
          This challenge was returned from legal review. Content can be edited again.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
