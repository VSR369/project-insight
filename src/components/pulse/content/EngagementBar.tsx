import { Flame, MessageCircle, Coins, Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToggleEngagement, useUserEngagements } from '@/hooks/queries/usePulseEngagements';
import { toast } from 'sonner';

interface EngagementBarProps {
  contentId: string;
  providerId: string;
  currentUserProviderId: string;
  fireCount: number;
  commentCount: number;
  goldCount: number;
  saveCount: number;
  onCommentClick?: () => void;
  showCounts?: boolean;
}

export function EngagementBar({
  contentId,
  providerId,
  currentUserProviderId,
  fireCount,
  commentCount,
  goldCount,
  saveCount,
  onCommentClick,
  showCounts = true,
}: EngagementBarProps) {
  const { data: userEngagements } = useUserEngagements(contentId, currentUserProviderId);
  const toggleEngagement = useToggleEngagement();

  const hasFired = userEngagements?.fire ?? false;
  const hasGolded = userEngagements?.gold ?? false;
  const hasSaved = userEngagements?.save ?? false;
  const hasBookmarked = userEngagements?.bookmark ?? false;

  const isOwnContent = providerId === currentUserProviderId;

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleFire = () => {
    if (isOwnContent) {
      toast.error("You can't engage with your own content");
      return;
    }
    toggleEngagement.mutate({ contentId, providerId: currentUserProviderId, engagementType: 'fire' });
  };

  const handleGold = () => {
    if (isOwnContent) {
      toast.error("You can't engage with your own content");
      return;
    }
    if (!hasGolded) {
      toast.info('Gold awards cost 1 gold token');
    }
    toggleEngagement.mutate({ contentId, providerId: currentUserProviderId, engagementType: 'gold' });
  };

  const handleSave = () => {
    if (isOwnContent) {
      toast.error("You can't engage with your own content");
      return;
    }
    toggleEngagement.mutate({ contentId, providerId: currentUserProviderId, engagementType: 'save' });
  };

  const handleBookmark = () => {
    toggleEngagement.mutate({ contentId, providerId: currentUserProviderId, engagementType: 'bookmark' });
    toast.success(hasBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Check this out on Pulse',
        url: `${window.location.origin}/pulse/content/${contentId}`,
      });
    } catch {
      // Fallback to copy link
      await navigator.clipboard.writeText(`${window.location.origin}/pulse/content/${contentId}`);
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <div className="flex items-center justify-between w-full" role="group" aria-label="Content engagement actions">
      <div className="flex items-center gap-1">
        {/* Fire Button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 px-2 gap-1.5 min-w-[44px]",
            hasFired && "text-orange-500 hover:text-orange-600"
          )}
          onClick={handleFire}
          disabled={toggleEngagement.isPending || isOwnContent}
          aria-label={hasFired ? `Remove fire reaction (${fireCount} fires)` : `Give fire reaction (${fireCount} fires)`}
          aria-pressed={hasFired}
        >
          <Flame className={cn("h-5 w-5", hasFired && "fill-current")} aria-hidden="true" />
          {showCounts && fireCount > 0 && (
            <span className="text-xs font-medium">{formatCount(fireCount)}</span>
          )}
        </Button>

        {/* Comment Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-1.5 min-w-[44px]"
          onClick={onCommentClick}
          aria-label={`View comments (${commentCount} comments)`}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          {showCounts && commentCount > 0 && (
            <span className="text-xs font-medium">{formatCount(commentCount)}</span>
          )}
        </Button>

        {/* Gold Button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 px-2 gap-1.5 min-w-[44px]",
            hasGolded && "text-yellow-500 hover:text-yellow-600"
          )}
          onClick={handleGold}
          disabled={toggleEngagement.isPending || isOwnContent}
          aria-label={hasGolded ? `Remove gold award (${goldCount} gold)` : `Give gold award (${goldCount} gold)`}
          aria-pressed={hasGolded}
        >
          <Coins className={cn("h-5 w-5", hasGolded && "fill-current")} aria-hidden="true" />
          {showCounts && goldCount > 0 && (
            <span className="text-xs font-medium">{formatCount(goldCount)}</span>
          )}
        </Button>

        {/* Save Button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 px-2 gap-1.5 min-w-[44px]",
            hasSaved && "text-primary"
          )}
          onClick={handleSave}
          disabled={toggleEngagement.isPending || isOwnContent}
          aria-label={hasSaved ? `Unsave content (${saveCount} saves)` : `Save content (${saveCount} saves)`}
          aria-pressed={hasSaved}
        >
          <Bookmark className={cn("h-5 w-5", hasSaved && "fill-current")} aria-hidden="true" />
          {showCounts && saveCount > 0 && (
            <span className="text-xs font-medium">{formatCount(saveCount)}</span>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-1">
        {/* Private Bookmark */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 min-w-[44px] min-h-[44px]",
            hasBookmarked && "text-primary"
          )}
          onClick={handleBookmark}
          disabled={toggleEngagement.isPending}
          aria-label={hasBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
          aria-pressed={hasBookmarked}
        >
          <Bookmark className={cn("h-4 w-4", hasBookmarked && "fill-current")} aria-hidden="true" />
        </Button>

        {/* Share */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 min-w-[44px] min-h-[44px]"
          onClick={handleShare}
          aria-label="Share content"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
