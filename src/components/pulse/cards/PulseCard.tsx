/**
 * PulseCard - Single card display component
 * Visual-first design with topic, content, media, and engagement bar
 */

import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReputationBadge } from './ReputationBadge';
import { CardEngagementBar } from './CardEngagementBar';
import type { PulseCard as PulseCardType } from '@/hooks/queries/usePulseCards';
import type { PulseCardLayer } from '@/hooks/queries/usePulseCardLayers';

interface PulseCardProps {
  card: PulseCardType;
  featuredLayer?: PulseCardLayer | null;
  reputation?: number;
  currentUserProviderId?: string;
  onShare?: () => void;
  className?: string;
  isDetailView?: boolean;
}

export function PulseCard({
  card,
  featuredLayer,
  reputation = 0,
  currentUserProviderId = '',
  onShare,
  className,
  isDetailView = false,
}: PulseCardProps) {
  const creatorName = card.creator
    ? `${card.creator.first_name} ${card.creator.last_name}`.trim()
    : 'Anonymous';

  const creatorInitials = card.creator
    ? `${card.creator.first_name?.[0] || ''}${card.creator.last_name?.[0] || ''}`
    : 'A';

  const content = featuredLayer?.content_text || 'No content available';
  const mediaUrl = featuredLayer?.media_url;
  const mediaType = featuredLayer?.media_type;

  const cardContent = (
    <>
      <blockquote className="text-foreground leading-relaxed mb-3 min-h-[60px]">
        "{content}"
      </blockquote>

      {/* Media Preview */}
      {mediaUrl && (
        <div className="mb-3 rounded-lg overflow-hidden bg-muted aspect-video max-h-[200px]">
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              aria-label="Card video preview"
            />
          ) : (
            <img
              src={mediaUrl}
              alt="Card media"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
      )}
    </>
  );

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:shadow-md",
        !isDetailView && "cursor-pointer",
        className
      )}
    >
      <CardContent className="p-4">
        {/* Topic Header */}
        <div className="flex items-center gap-2 mb-3">
          {card.topic?.icon && (
            <span className="text-lg" aria-hidden="true">{card.topic.icon}</span>
          )}
          <Badge 
            variant="secondary" 
            className="text-xs font-medium"
            style={card.topic?.color ? { backgroundColor: card.topic.color, color: '#fff' } : undefined}
          >
            {card.topic?.name || 'General'}
          </Badge>
        </div>

        {/* Content */}
        {isDetailView ? (
          <div className="block">{cardContent}</div>
        ) : (
          <Link to={`/pulse/cards/${card.id}`} className="block">{cardContent}</Link>
        )}


        {/* Creator Info */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {creatorInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                @{creatorName.replace(/\s+/g, '')}
              </span>
              <ReputationBadge reputation={reputation} size="sm" />
            </div>
          </div>

          {/* Build Count */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" aria-label={`${card.build_count} builds`}>
              <Layers className="h-4 w-4" aria-hidden="true" />
              {card.build_count}
            </span>
          </div>
        </div>

        {/* Engagement Bar */}
        {currentUserProviderId && (
          <div className="mt-3 pt-3 border-t border-border">
            <CardEngagementBar
              cardId={card.id}
              creatorId={card.seed_creator_id}
              currentUserProviderId={currentUserProviderId}
              fireCount={card.fire_count || 0}
              commentCount={card.comment_count || 0}
              goldCount={card.gold_count || 0}
              saveCount={card.save_count || 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
