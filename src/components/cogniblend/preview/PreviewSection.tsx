/**
 * PreviewSection — Individual section with view/edit toggle.
 */

import { ReactNode } from 'react';
import { Pencil, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewSectionProps {
  sectionKey: string;
  label: string;
  attribution?: string;
  canEdit: boolean;
  isLocked: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  children: ReactNode;
  editContent?: ReactNode;
}

export function PreviewSection({
  sectionKey,
  label,
  attribution,
  canEdit,
  isLocked,
  isEditing,
  onStartEdit,
  children,
  editContent,
}: PreviewSectionProps) {
  return (
    <div id={`preview-section-${sectionKey}`} className="py-5 border-b border-border/40 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground tracking-tight">{label}</h3>
          {attribution && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{attribution}</span>
          )}
        </div>
        <div className="shrink-0 print:hidden">
          {isLocked ? (
            <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
          ) : canEdit && !isEditing ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStartEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="text-sm leading-relaxed text-foreground/85">
        {isEditing && editContent ? editContent : children}
      </div>
    </div>
  );
}
