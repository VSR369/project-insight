/**
 * PulseCardFeedItem - Display a Pulse Card in the main feed
 * Compact card format matching ContentCard style
 */

import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Layers, Eye, Share2, GitBranch } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { FeedCardItem } from '@/hooks/queries/useUnifiedPulseFeed';

interface PulseCardFeedItemProps {
  card: FeedCardItem;
  onCardClick?: () => void;
  onProfileClick?: () => void;
}

export const PulseCardFeedItem = memo(function PulseCardFeedItem({
  card,
  onCardClick,
  onProfileClick,
}: PulseCardFeedItemProps) {
  const creatorName = card.creator
    ? `${card.creator.first_name || ''} ${card.creator.last_name || ''}`.trim() || 'Anonymous'
    : 'Anonymous';

  const initials = creatorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const contentText = card.featured_layer?.content_text || '';
  const shouldTruncate = contentText.length > 280;

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

      <CardContent className="px-4 py-2 cursor-pointer" onClick={onCardClick}>
        {/* Media preview if available */}
        {card.featured_layer?.media_url && (
          <div className="mb-3 rounded-lg overflow-hidden">
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

        {/* Content Text */}
        {contentText && (
          <p className={cn(
            "text-sm text-foreground/90 whitespace-pre-wrap",
            shouldTruncate && "line-clamp-4"
          )}>
            {contentText}
          </p>
        )}

        {shouldTruncate && (
          <Button
            variant="link"
            className="p-0 h-auto text-primary text-sm"
            onClick={(e) => {
              e.stopPropagation();
              onCardClick?.();
            }}
          >
            View full card
          </Button>
        )}
      </CardContent>

      <CardFooter className="px-4 py-2 border-t border-border">
        {/* Card-specific stats */}
        <div className="flex items-center gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" aria-hidden="true" />
            <span>{card.view_count || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            <span>{card.build_count || 0} builds</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>{card.share_count || 0}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
});
