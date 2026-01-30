/**
 * TopicSelector - Inline topic chips for one-tap selection
 */

import { cn } from '@/lib/utils';
import { usePulseCardTopics } from '@/hooks/queries/usePulseCardTopics';
import { Skeleton } from '@/components/ui/skeleton';

interface TopicSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TopicSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TopicSelectorProps) {
  const { data: topics = [], isLoading } = usePulseCardTopics();

  // Loading state - skeleton chips
  if (isLoading) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
    );
  }

  // Empty state
  if (topics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No topics available</p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Select a topic"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {topics.map((topic) => {
        const isSelected = value === topic.id;
        return (
          <button
            key={topic.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(topic.id)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "min-h-[36px]",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-foreground border border-border",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {topic.icon && <span>{topic.icon}</span>}
            {topic.name}
          </button>
        );
      })}
    </div>
  );
}
