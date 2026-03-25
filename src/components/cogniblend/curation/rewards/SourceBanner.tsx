/**
 * SourceBanner — Shows attribution when reward data is auto-populated from upstream role.
 */

import { Info } from 'lucide-react';
import { getRoleDisplayName, type SourceRole } from '@/services/rewardStructureResolver';

interface SourceBannerProps {
  sourceRole: SourceRole;
  sourceDate?: string;
  isModified: boolean;
  onEdit: () => void;
  onReset?: () => void;
}

export default function SourceBanner({
  sourceRole,
  sourceDate,
  isModified,
  onEdit,
  onReset,
}: SourceBannerProps) {
  const roleName = getRoleDisplayName(sourceRole);
  const formattedDate = sourceDate
    ? new Date(sourceDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
      <Info className="h-3 w-3 text-primary shrink-0" />
      <span className="text-[12px] text-primary flex-1">
        Populated from {roleName}
        {formattedDate && <span className="text-primary/60"> · {formattedDate}</span>}
      </span>

      {isModified && (
        <span className="bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
          Modified
        </span>
      )}

      {isModified && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-muted-foreground underline cursor-pointer"
        >
          Reset to {roleName} values
        </button>
      )}

      <button
        type="button"
        onClick={onEdit}
        className="text-[11px] text-primary underline cursor-pointer"
      >
        Edit
      </button>
    </div>
  );
}
