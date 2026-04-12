/**
 * CreatorApprovalStatusBanner — Displays creator approval status
 * based on operating model and creator_approval_required flag.
 */

import { ClipboardList, Info } from "lucide-react";

interface CreatorApprovalStatusBannerProps {
  operatingModel: string | null;
  creatorApprovalRequired: boolean | null;
  communityCreationAllowed?: boolean;
  isAnonymous?: boolean;
}

export function CreatorApprovalStatusBanner({
  operatingModel,
  creatorApprovalRequired,
  communityCreationAllowed,
  isAnonymous,
}: CreatorApprovalStatusBannerProps) {
  if (operatingModel === 'MP') {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30 p-3">
        <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <span className="font-semibold">Marketplace:</span> Once curation is complete and legal + financial
          reviews are done, this challenge will be sent to the Creator for mandatory approval before publication.
        </p>
      </div>
    );
  }

  if (operatingModel === 'AGG' && creatorApprovalRequired) {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/30 p-3">
        <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800 dark:text-blue-300">
          <span className="font-semibold">Creator has requested approval:</span> This challenge will return to the
          Creator for review once legal and financial steps are complete. Publication requires Creator sign-off.
        </p>
      </div>
    );
  }

  if (operatingModel === 'AGG') {
    return (
      <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 p-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">No Creator approval required:</span> This challenge can proceed to publication
          once curation, legal, and financial steps are complete. The Creator set this preference at challenge creation.
        </p>
      </div>
    );
  }

  const prefBadges = (
    <div className="flex flex-wrap gap-2 mt-2">
      {communityCreationAllowed && (
        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
          Community Creation: Allowed
        </span>
      )}
      {isAnonymous && (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
          Anonymous Challenge
        </span>
      )}
    </div>
  );

  if (!communityCreationAllowed && !isAnonymous) return null;

  return (
    <div className="flex flex-col rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-start gap-2.5">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-muted-foreground">Creator Preferences</p>
          {prefBadges}
        </div>
      </div>
    </div>
  );
}
