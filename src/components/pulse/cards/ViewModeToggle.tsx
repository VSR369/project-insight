/**
 * ViewModeToggle - Pill toggle for Read/Contributors view
 */

import { cn } from '@/lib/utils';
import { BookOpen, Users } from 'lucide-react';

export type ViewMode = 'compiled' | 'contributors';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

export function ViewModeToggle({ value, onChange, disabled }: ViewModeToggleProps) {
  return (
    <div 
      role="tablist" 
      aria-label="View mode"
      className="inline-flex bg-muted rounded-full p-1 gap-1"
    >
      <button
        role="tab"
        aria-selected={value === 'compiled'}
        aria-controls="view-panel"
        onClick={() => onChange('compiled')}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          value === 'compiled' 
            ? "bg-background text-primary shadow-sm" 
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <BookOpen className="h-4 w-4" />
        <span>Read</span>
      </button>
      <button
        role="tab"
        aria-selected={value === 'contributors'}
        aria-controls="view-panel"
        onClick={() => onChange('contributors')}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          value === 'contributors' 
            ? "bg-background text-primary shadow-sm" 
            : "text-muted-foreground hover:text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Users className="h-4 w-4" />
        <span>Contributors</span>
      </button>
    </div>
  );
}
