import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export function CommentSectionLoading() {
  return (
    <div className="space-y-4 p-4" role="status" aria-label="Loading comments">
      <span className="sr-only">Loading comments…</span>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface CommentSectionErrorProps {
  onRetry?: () => void;
}

export function CommentSectionError({ onRetry }: CommentSectionErrorProps) {
  return (
    <div className="p-4 text-center space-y-3" role="alert">
      <p className="text-sm text-destructive">Failed to load comments. Please try again.</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="min-h-[44px]" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
