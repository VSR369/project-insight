/**
 * CardEngagementBar - Engagement actions for Pulse Cards
 * Mirrors EngagementBar.tsx but for cards instead of content
 */

import { Flame, MessageCircle, Medal, Bookmark, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToggleCardEngagement, useCardUserEngagements, PULSE_CARD_XP_REWARDS } from '@/hooks/queries/usePulseCardEngagements';
import { toast } from 'sonner';

interface CardEngagementBarProps {
  cardId: string;
  creatorId: string;
  currentUserProviderId: string;
  fireCount: number;
  commentCount: number;
  goldCount: number;
  saveCount: number;
  onCommentClick?: () => void;
  showCounts?: boolean;
}

export function CardEngagementBar({
  cardId,
  creatorId,
  currentUserProviderId,
  fireCount,
  commentCount,
  goldCount,
  saveCount,
  onCommentClick,
  showCounts = true,
}: CardEngagementBarProps) {
  const { data: userEngagements } = useCardUserEngagements(cardId, currentUserProviderId);
  const toggleEngagement = useToggleCardEngagement();

  const hasFired = userEngagements?.fire ?? false;
  const hasGolded = userEngagements?.gold ?? false;
  const hasSaved = userEngagements?.save ?? false;

  const isOwnCard = creatorId === currentUserProviderId;

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const handleFire = () => {
    if (isOwnCard) {
      toast.error("You can't engage with your own card");
      return;
    }
    toggleEngagement.mutate({ cardId, providerId: currentUserProviderId, engagementType: 'fire' });
  };

  const handleGold = () => {
    if (isOwnCard) {
      toast.error("You can't engage with your own card");
      return;
    }
    if (!hasGolded) {
      toast.info('Gold awards cost 1 gold token');
    }
    toggleEngagement.mutate({ cardId, providerId: currentUserProviderId, engagementType: 'gold' });
  };

  const handleSave = () => {
    toggleEngagement.mutate({ cardId, providerId: currentUserProviderId, engagementType: 'save' });
    toast.success(hasSaved ? 'Removed from saved' : 'Saved for later');
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Check this out on Pulse',
        url: `${window.location.origin}/pulse/cards/${cardId}`,
      });
    } catch {
      // Fallback to copy link
      await navigator.clipboard.writeText(`${window.location.origin}/pulse/cards/${cardId}`);
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <div className="flex items-center justify-between w-full" role="group" aria-label="Card engagement actions">
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
          disabled={toggleEngagement.isPending || isOwnCard}
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
          disabled={toggleEngagement.isPending || isOwnCard}
          aria-label={hasGolded ? `Remove gold award (${goldCount} gold)` : `Give gold award (${goldCount} gold)`}
          aria-pressed={hasGolded}
        >
          <Medal className={cn("h-5 w-5", hasGolded && "fill-current")} aria-hidden="true" />
          {showCounts && goldCount > 0 && (
            <span className="text-xs font-medium">{formatCount(goldCount)}</span>
          )}
        </Button>

        {/* Save/Bookmark Button */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 px-2 gap-1.5 min-w-[44px]",
            hasSaved && "text-primary"
          )}
          onClick={handleSave}
          disabled={toggleEngagement.isPending}
          aria-label={hasSaved ? 'Remove from saved' : 'Save for later'}
          aria-pressed={hasSaved}
        >
          <Bookmark className={cn("h-5 w-5", hasSaved && "fill-current")} aria-hidden="true" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        {/* Share */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 min-w-[44px] min-h-[44px]"
          onClick={handleShare}
          aria-label="Share card"
        >
          <Share2 className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
