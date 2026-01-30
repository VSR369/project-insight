/**
 * TopicSelector - Inline topic chips for one-tap selection
 * Shows topics relevant to provider's enrolled industry segments + General
 */

import { cn } from '@/lib/utils';
import { usePulseCardTopicsForProvider, type PulseCardTopic } from '@/hooks/queries/usePulseCardTopics';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface TopicSelectorProps {
  value: string;
  onChange: (value: string) => void;
  industrySegmentIds: string[];
  disabled?: boolean;
  className?: string;
}

// Group topics by industry segment for visual organization
function groupTopicsByIndustry(topics: PulseCardTopic[]) {
  const groups: Map<string | null, { name: string | null; topics: PulseCardTopic[] }> = new Map();
  
  for (const topic of topics) {
    const segmentId = topic.industry_segment_id;
    const segmentName = topic.industry_segment?.name ?? null;
    
    if (!groups.has(segmentId)) {
      groups.set(segmentId, { name: segmentName, topics: [] });
    }
    groups.get(segmentId)!.topics.push(topic);
  }
  
  // Sort: General (null) first, then alphabetically by industry name
  return Array.from(groups.entries()).sort((a, b) => {
    if (a[0] === null) return -1;
    if (b[0] === null) return 1;
    return (a[1].name || '').localeCompare(b[1].name || '');
  });
}

export function TopicSelector({
  value,
  onChange,
  industrySegmentIds,
  disabled = false,
  className,
}: TopicSelectorProps) {
  const { data: topics = [], isLoading } = usePulseCardTopicsForProvider(industrySegmentIds);

  // Loading state - skeleton chips
  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (topics.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No topics available. Please complete your industry enrollment first.
      </p>
    );
  }

  // Group topics by industry segment
  const groupedTopics = groupTopicsByIndustry(topics);

  return (
    <div
      role="radiogroup"
      aria-label="Select a topic"
      className={cn("space-y-3", className)}
    >
      {groupedTopics.map(([segmentId, group]) => (
        <div key={segmentId ?? 'general'} className="space-y-1.5">
          {/* Industry label for non-general topics */}
          {segmentId !== null && (
            <Badge variant="outline" className="text-xs font-normal">
              {group.name}
            </Badge>
          )}
          
          {/* Topic chips */}
          <div className="flex flex-wrap gap-2">
            {group.topics.map((topic) => {
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
        </div>
      ))}
    </div>
  );
}
