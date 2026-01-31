/**
 * FollowButton - Reusable follow/unfollow button for social features
 * Responsive: Icon-only on mobile, text on desktop
 */

import { memo } from 'react';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsFollowing, useToggleFollow } from '@/hooks/queries/usePulseSocial';

interface FollowButtonProps {
  targetProviderId: string;
  currentUserProviderId?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

export const FollowButton = memo(function FollowButton({
  targetProviderId,
  currentUserProviderId,
  variant = 'default',
  className,
}: FollowButtonProps) {
  const { data: isFollowing, isLoading: isCheckingFollow } = useIsFollowing(
    currentUserProviderId,
    targetProviderId
  );
  const { mutate: toggleFollow, isPending: isToggling } = useToggleFollow();

  // Don't show for own content or if no current user
  if (!currentUserProviderId || currentUserProviderId === targetProviderId) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    toggleFollow({
      followerId: currentUserProviderId,
      followingId: targetProviderId,
    });
  };

  const isLoading = isCheckingFollow || isToggling;
  const isCompact = variant === 'compact';

  if (isFollowing) {
    // Following state - subtle appearance
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          "shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50",
          isCompact ? "h-6 w-6 p-0 sm:w-auto sm:px-2 sm:gap-1" : "h-7 px-2 gap-1",
          className
        )}
        aria-label="Unfollow"
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <>
            <UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
            <span className={cn("text-xs", isCompact && "hidden sm:inline")}>
              Following
            </span>
          </>
        )}
      </Button>
    );
  }

  // Not following - prominent appearance
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        "shrink-0 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50",
        isCompact ? "h-6 w-6 p-0 sm:w-auto sm:px-2 sm:gap-1" : "h-7 px-2 gap-1",
        className
      )}
      aria-label="Follow"
    >
      {isLoading ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <>
          <UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          <span className={cn("text-xs", isCompact && "hidden sm:inline")}>
            Follow
          </span>
        </>
      )}
    </Button>
  );
});
