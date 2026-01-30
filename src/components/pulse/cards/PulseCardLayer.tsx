/**
 * PulseCardLayer - Layer display component with voting
 */

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CardVoteButton } from './CardVoteButton';
import { ReputationBadge } from './ReputationBadge';
import type { PulseCardLayer as LayerType } from '@/hooks/queries/usePulseCardLayers';
import { formatDistanceToNow, isFuture, parseISO } from 'date-fns';

interface PulseCardLayerProps {
  layer: LayerType;
  reputation?: number;
  userVote?: 'up' | 'down' | null;
  canVote?: boolean;
  onVote?: (voteType: 'up' | 'down') => void;
  className?: string;
}

export function PulseCardLayer({
  layer,
  reputation = 0,
  userVote,
  canVote = false,
  onVote,
  className,
}: PulseCardLayerProps) {
  const creatorName = layer.creator
    ? `${layer.creator.first_name} ${layer.creator.last_name}`.trim()
    : 'Anonymous';

  const creatorInitials = layer.creator
    ? `${layer.creator.first_name?.[0] || ''}${layer.creator.last_name?.[0] || ''}`
    : 'A';

  const votingEndsAt = layer.voting_ends_at ? parseISO(layer.voting_ends_at) : null;
  const isVotingOpen = votingEndsAt ? isFuture(votingEndsAt) : false;

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border bg-card",
        layer.is_featured && "border-primary ring-1 ring-primary/20",
        className
      )}
    >
      {/* Featured Badge */}
      {layer.is_featured && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Content */}
      <blockquote className="text-foreground leading-relaxed mb-3">
        "{layer.content_text}"
      </blockquote>

      {/* Media */}
      {layer.media_url && (
        <div className="mb-3 rounded-lg overflow-hidden bg-muted aspect-video max-h-[150px]">
          {layer.media_type === 'video' ? (
            <video
              src={layer.media_url}
              className="w-full h-full object-cover"
              controls
              muted
              playsInline
            />
          ) : (
            <img
              src={layer.media_url}
              alt="Layer media"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        {/* Creator Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
              {creatorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              @{creatorName.replace(/\s+/g, '')}
            </span>
            <div className="flex items-center gap-2">
              <ReputationBadge reputation={reputation} size="xs" />
              {isVotingOpen && votingEndsAt && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(votingEndsAt, { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Voting */}
        <div className="flex items-center gap-2">
          <CardVoteButton
            direction="up"
            count={layer.votes_up}
            isActive={userVote === 'up'}
            disabled={!canVote || !isVotingOpen}
            onClick={() => onVote?.('up')}
          />
          <CardVoteButton
            direction="down"
            count={layer.votes_down}
            isActive={userVote === 'down'}
            disabled={!canVote || !isVotingOpen}
            onClick={() => onVote?.('down')}
          />
        </div>
      </div>
    </div>
  );
}
