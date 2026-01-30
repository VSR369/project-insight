/**
 * CompiledView - AI-synthesized narrative display
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContributorAvatars, type Contributor } from './ContributorAvatars';
import { Loader2, RefreshCw, History, Plus, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CompiledViewProps {
  narrative: string | null;
  compiledAt: string | null;
  isStale: boolean;
  contributors: Contributor[];
  layerCount: number;
  isLoading: boolean;
  isCompiling: boolean;
  onRecompile: () => void;
  onImprove: () => void;
  onViewHistory: () => void;
  fallbackReason?: string;
}

export function CompiledView({
  narrative,
  compiledAt,
  isStale,
  contributors,
  layerCount,
  isLoading,
  isCompiling,
  onRecompile,
  onImprove,
  onViewHistory,
  fallbackReason,
}: CompiledViewProps) {
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    );
  }

  // Empty state
  if (!narrative && layerCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Plus className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">Be the first to contribute</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Start building knowledge on this topic. Your contribution will help others learn.
        </p>
        <Button onClick={onImprove}>
          <Plus className="h-4 w-4 mr-2" />
          Add Knowledge
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Narrative Card */}
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Stale indicator */}
        {isStale && !isCompiling && (
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-4 pb-4 border-b border-border">
            <RefreshCw className="h-3 w-3" />
            <span>New contributions available</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={onRecompile}
            >
              Refresh
            </Button>
          </div>
        )}

        {/* Compiling state */}
        {isCompiling && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Synthesizing contributions...</span>
          </div>
        )}

        {/* Fallback notice */}
        {fallbackReason && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
            <AlertCircle className="h-3 w-3" />
            <span>{fallbackReason}</span>
          </div>
        )}

        {/* Narrative Content */}
        <p className={cn(
          "text-lg leading-relaxed text-foreground",
          isCompiling && "opacity-50"
        )}>
          {narrative || "No content available yet."}
        </p>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Contributor info */}
            <div className="flex items-center gap-3">
              <ContributorAvatars contributors={contributors} />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{contributors.length}</span>
                {' '}contributor{contributors.length !== 1 ? 's' : ''}
                {compiledAt && (
                  <>
                    <span className="mx-2">·</span>
                    <span>Updated {formatDistanceToNow(new Date(compiledAt), { addSuffix: true })}</span>
                  </>
                )}
              </div>
            </div>

            {/* Build history link */}
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                onViewHistory();
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <History className="h-4 w-4" />
              View build history
            </button>
          </div>
        </div>
      </div>

      {/* Improve CTA */}
      <Button
        variant="outline"
        className="w-full border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5 text-primary"
        onClick={onImprove}
      >
        <Plus className="h-4 w-4 mr-2" />
        Improve this Knowledge
      </Button>
    </div>
  );
}
