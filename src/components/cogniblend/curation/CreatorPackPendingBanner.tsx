/**
 * CreatorPackPendingBanner — Read-only banner shown to the Creator when
 * the pack is still in the Curator's review queue (status =
 * 'pending_curator_review').  Prevents the Creator from approving prematurely.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Hourglass } from 'lucide-react';

export function CreatorPackPendingBanner() {
  return (
    <Alert className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <Hourglass className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Pack under Curator review
      </AlertTitle>
      <AlertDescription className="text-xs text-amber-800 dark:text-amber-300">
        Legal and financial reviews are complete. The Curator is reviewing the final pack and will forward it to you for approval shortly.
      </AlertDescription>
    </Alert>
  );
}
