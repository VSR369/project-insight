/**
 * PulseCardFeedItem - Display a Pulse Card in the main feed
 * Shows compiled AI narrative with "Read more" link and full engagement bar
 */

import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Layers, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CardEngagementBar } from '@/components/pulse/cards/CardEngagementBar';
import type { FeedCardItem } from '@/hooks/queries/useUnifiedPulseFeed';

interface PulseCardFeedItemProps {
  card: FeedCardItem;
  currentUserProviderId?: string;
  onCardClick?: () => void;
  onProfileClick?: () => void;
}

export const PulseCardFeedItem = memo(function PulseCardFeedItem({
  card,
  currentUserProviderId = '',
  onCardClick,
  onProfileClick,
}: PulseCardFeedItemProps) {
  const creatorName = card.creator
    ? `${card.creator.first_name || ''} ${card.creator.last_name || ''}`.trim() || 'Anonymous'
    : 'Anonymous';

  const initials = creatorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  // Prefer compiled narrative, fallback to featured layer content
  const displayText = card.compiled_narrative || card.featured_layer?.content_text || '';
  const hasCompiledNarrative = !!card.compiled_narrative;
  const shouldTruncate = displayText.length > 200;
  const contributorCount = card.build_count || 1;

  const handleProfileKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onProfileClick?.();
    }
  };

  return (
    <Card className="border-x-0 rounded-none shadow-none hover:bg-muted/30 transition-colors">
      <CardHeader className="flex flex-row items-start gap-3 p-4 pb-2">
        {/* Avatar */}
        <Avatar 
          className="h-10 w-10 cursor-pointer ring-2 ring-border"
          onClick={onProfileClick}
          tabIndex={0}
          role="button"
          aria-label={`View ${creatorName}'s profile`}
          onKeyDown={handleProfileKeyDown}
        >
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Header Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span 
              className="font-semibold text-sm truncate cursor-pointer hover:underline"
              onClick={onProfileClick}
              tabIndex={0}
              role="button"
              aria-label={`View ${creatorName}'s profile`}
              onKeyDown={handleProfileKeyDown}
            >
              {creatorName}
            </span>
            {/* Pulse Card badge */}
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0 bg-cyan-500/10 text-cyan-700 border-cyan-200">
              <Layers className="h-3 w-3 mr-1" aria-hidden="true" />
              Pulse Card
            </Badge>
            {/* Topic badge */}
            {card.topic && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                {card.topic.icon && <span className="mr-1">{card.topic.icon}</span>}
                {card.topic.name}
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(card.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              aria-label="Card options"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Share</DropdownMenuItem>
            <DropdownMenuItem>Copy Link</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="px-4 py-2">
        {/* Media preview if available */}
        {card.featured_layer?.media_url && (
          <div className="mb-3 rounded-lg overflow-hidden cursor-pointer" onClick={onCardClick}>
            {card.featured_layer.media_type === 'video' ? (
              <video
                src={card.featured_layer.media_url}
                className="w-full max-h-[300px] object-cover"
                muted
                playsInline
              />
            ) : (
              <img
                src={card.featured_layer.media_url}
                alt=""
                className="w-full max-h-[300px] object-cover"
              />
            )}
          </div>
        )}

        {/* Compiled Content with indicator */}
        {displayText && (
          <div className="space-y-2">
            {hasCompiledNarrative && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3" aria-hidden="true" />
                <span>AI-synthesized from {contributorCount} contribution{contributorCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            <p className={cn(
              "text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed",
              shouldTruncate && "line-clamp-4"
            )}>
              {displayText}
            </p>
          </div>
        )}

        {/* Read more link */}
        <Button
          variant="link"
          className="p-0 h-auto text-primary text-sm mt-2 gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onCardClick?.();
          }}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Read more
        </Button>
      </CardContent>

      <CardFooter className="px-4 py-2 border-t border-border">
        {/* Full Engagement Bar - matches other content types */}
        <CardEngagementBar
          cardId={card.id}
          creatorId={card.seed_creator_id}
          currentUserProviderId={currentUserProviderId}
          fireCount={card.fire_count || 0}
          commentCount={card.comment_count || 0}
          goldCount={card.gold_count || 0}
          saveCount={card.save_count || 0}
          onCommentClick={onCardClick}
        />
      </CardFooter>
    </Card>
  );
});