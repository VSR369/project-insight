import { useState, memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Play, Volume2, Headphones, Image as ImageIcon, FileText, Zap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EngagementBar } from './EngagementBar';
import { MediaRenderer } from './MediaRenderer';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import type { PulseContentType } from '@/constants/pulse.constants';

type PulseContent = Database['public']['Tables']['pulse_content']['Row'];

interface ContentCardProps {
  content: PulseContent & {
    provider?: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      avatar_url?: string;
    };
    tags?: Array<{ id: string; name: string }>;
  };
  currentUserProviderId: string;
  onContentClick?: () => void;
  onProfileClick?: () => void;
  onCommentClick?: () => void;
}

const contentTypeIcons = {
  reel: Play,
  podcast: Headphones,
  spark: Zap,
  article: FileText,
  gallery: ImageIcon,
  post: FileText,
} as const;

const contentTypeLabels = {
  reel: 'Reel',
  podcast: 'Podcast',
  spark: 'Spark',
  article: 'Article',
  gallery: 'Gallery',
  post: 'Post',
} as const;

export const ContentCard = memo(function ContentCard({ 
  content, 
  currentUserProviderId, 
  onContentClick, 
  onProfileClick, 
  onCommentClick 
}: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const providerName = content.provider 
    ? `${content.provider.first_name || ''} ${content.provider.last_name || ''}`.trim() || 'Anonymous'
    : 'Anonymous';
  
  const initials = providerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const ContentIcon = contentTypeIcons[content.content_type as keyof typeof contentTypeIcons] || FileText;
  
  const displayText = content.content_type === 'spark' 
    ? content.key_insight 
    : content.content_type === 'article' 
      ? content.body_text 
      : content.caption;
  
  const shouldTruncate = displayText && displayText.length > 280;

  const handleProfileKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onProfileClick?.();
    }
  };

  return (
    <Card className="border-x-0 rounded-none shadow-none hover:bg-muted/30 transition-colors">
      <CardHeader className="flex flex-row items-start gap-3 p-4 pb-2">
        {/* Avatar - keyboard accessible */}
        <Avatar 
          className="h-10 w-10 cursor-pointer ring-2 ring-border"
          onClick={onProfileClick}
          tabIndex={0}
          role="button"
          aria-label={`View ${providerName}'s profile`}
          onKeyDown={handleProfileKeyDown}
        >
          <AvatarImage src={content.provider?.avatar_url} alt="" />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Header Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span 
              className="font-semibold text-sm truncate cursor-pointer hover:underline"
              onClick={onProfileClick}
              tabIndex={0}
              role="button"
              aria-label={`View ${providerName}'s profile`}
              onKeyDown={handleProfileKeyDown}
            >
              {providerName}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
              <ContentIcon className="h-3 w-3 mr-1" aria-hidden="true" />
              {contentTypeLabels[content.content_type as keyof typeof contentTypeLabels]}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* More Options - accessible trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              aria-label="Content options"
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

      <CardContent className="px-4 py-2 cursor-pointer" onClick={onContentClick}>
        {/* Title (for articles/podcasts) */}
        {content.title && (
          <h3 className="font-semibold text-base mb-2">{content.title}</h3>
        )}

        {/* Headline (for sparks) */}
        {content.headline && (
          <h3 className="font-bold text-lg mb-2 text-primary">{content.headline}</h3>
        )}

        {/* Media Preview */}
        {content.media_urls && Array.isArray(content.media_urls) && (content.media_urls as string[]).length > 0 && (
          <div className="mb-3">
            <MediaRenderer
              contentType={content.content_type as PulseContentType}
              mediaUrls={content.media_urls as string[]}
              coverImageUrl={content.cover_image_url || undefined}
              title={content.title || content.headline || undefined}
              isPreview
            />
          </div>
        )}

        {/* Text Content */}
        {displayText && (
          <p className={cn(
            "text-sm text-foreground/90 whitespace-pre-wrap",
            !isExpanded && shouldTruncate && "line-clamp-4"
          )}>
            {displayText}
          </p>
        )}
        
        {shouldTruncate && (
          <Button
            variant="link"
            className="p-0 h-auto text-primary text-sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Show less' : 'Read more'}
          </Button>
        )}

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3" role="list" aria-label="Content tags">
            {content.tags.slice(0, 5).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs" role="listitem">
                #{tag.name}
              </Badge>
            ))}
            {content.tags.length > 5 && (
              <Badge variant="outline" className="text-xs" role="listitem">
                +{content.tags.length - 5} more
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="px-4 py-2 border-t border-border">
        <EngagementBar
          contentId={content.id}
          providerId={content.provider_id}
          currentUserProviderId={currentUserProviderId}
          fireCount={content.fire_count}
          commentCount={content.comment_count}
          goldCount={content.gold_count}
          saveCount={content.save_count}
          onCommentClick={onCommentClick}
        />
      </CardFooter>
    </Card>
  );
});
