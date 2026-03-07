import { Badge } from '@/components/ui/badge';

interface IndustryTagChipsProps {
  tags: string[];
  maxVisible?: number;
}

/**
 * GAP-3: Industry Tags pill chips — shows up to maxVisible tags + "+N" overflow
 */
export function IndustryTagChips({ tags, maxVisible = 2 }: IndustryTagChipsProps) {
  if (!tags || tags.length === 0) return <span className="text-muted-foreground text-xs">—</span>;

  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          {tag}
        </Badge>
      ))}
      {overflow > 0 && (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 text-muted-foreground"
        >
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
