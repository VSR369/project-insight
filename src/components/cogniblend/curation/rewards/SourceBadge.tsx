/**
 * SourceBadge — Small pill badge indicating field origin.
 *
 * Colors:
 *   CR → amber/warning (pre-filled, curator should verify)
 *   AI → blue/info (suggested, not yet confirmed)
 *   Curator → gray/secondary (curator-owned value)
 *   Modified → amber + pencil icon (overridden from CR/AI)
 */

import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FieldSourceType = 'am' | 'ai' | 'curator' | 'creator';

export interface FieldSource {
  src: FieldSourceType;
  modified?: boolean;
}

interface SourceBadgeProps {
  source: FieldSource;
  className?: string;
}

const SOURCE_CONFIG: Record<FieldSourceType, { label: string; classes: string }> = {
  am: {
    label: 'Creator',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  creator: {
    label: 'Creator',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ai: {
    label: 'AI',
    classes: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  curator: {
    label: 'Curator',
    classes: 'bg-muted text-muted-foreground border-border',
  },
};

export default function SourceBadge({ source, className }: SourceBadgeProps) {
  if (source.modified) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
          'bg-amber-50 text-amber-600 border-amber-200',
          className,
        )}
      >
        <Pencil className="h-2 w-2" />
        Modified
      </span>
    );
  }

  const config = SOURCE_CONFIG[source.src];

  return (
    <span
      className={cn(
        'inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
        config.classes,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
