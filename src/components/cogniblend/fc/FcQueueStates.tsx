import { AlertCircle, Banknote, Inbox, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface FcQueueHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function FcQueueHeader({ searchQuery, onSearchChange }: FcQueueHeaderProps) {
  return (
    <>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Banknote className="h-5 w-5 text-primary" /> Finance Workspace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review finance workspaces for CONTROLLED governance challenges assigned to you.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Finance review applies to CONTROLLED governance challenges only.
        </p>
      </div>

      <div className="relative w-full lg:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search challenges..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="pl-9 text-base"
        />
      </div>
    </>
  );
}

export function FcQueueLoadingState() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-11 w-full lg:w-80" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

interface FcQueueEmptyStateProps {
  hasSearch: boolean;
  onViewDashboard: () => void;
}

export function FcQueueEmptyState({ hasSearch, onViewDashboard }: FcQueueEmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">
          {hasSearch ? 'No matching challenges' : 'No FC assignments yet'}
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
          {hasSearch
            ? 'No challenges match your search.'
            : "You haven't been assigned as Finance Coordinator on any CONTROLLED challenges yet. New CONTROLLED challenges will appear here once a Curator advances them and routes you in."}
        </p>
        {!hasSearch && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onViewDashboard}>
            View Dashboard
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface FcQueueErrorStateProps {
  correlationId: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export function FcQueueErrorState({
  correlationId,
  onRetry,
  isRetrying,
}: FcQueueErrorStateProps) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
        <p className="text-sm font-medium text-foreground">Unable to load your Finance Workspace</p>
        <p className="mx-auto mt-1 max-w-lg text-xs text-muted-foreground">
          We couldn&apos;t load your assigned finance challenges right now. Please retry. If the
          issue continues, share this correlation ID with support.
        </p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">Correlation ID: {correlationId}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? 'Retrying...' : 'Retry'}
        </Button>
      </CardContent>
    </Card>
  );
}