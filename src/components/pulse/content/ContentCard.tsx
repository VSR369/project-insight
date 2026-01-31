import { useState, memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Play, Volume2, Headphones, Image as ImageIcon, FileText, Zap, Clock, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EngagementBar } from './EngagementBar';
import { MediaRenderer } from './MediaRenderer';
import { SparkTrendChart } from './SparkTrendChart';
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
      verified_skill?: string | null;
    };
    tags?: Array<{ id: string; name: string }>;
    industry_segment?: { id: string; name: string } | null;
    duration_seconds?: number | null;
  };
  currentUserProviderId: string;
  onContentClick?: () => void;
  onProfileClick?: () => void;
  onCommentClick?: () => void;
}

// Format video duration as MM:SS or M:SS
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

// Calculate read time for articles (200 WPM)
function calculateReadTime(text: string | null | undefined): string | null {
  if (!text) return null;
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min read`;
}

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
      <CardHeader className="flex flex-row items-start gap-2 sm:gap-3 p-3 sm:p-4 pb-2">
        {/* Avatar - keyboard accessible */}
        <Avatar 
          className="h-8 w-8 sm:h-10 sm:w-10 cursor-pointer ring-2 ring-border flex-shrink-0"
          onClick={onProfileClick}
          tabIndex={0}
          role="button"
          aria-label={`View ${providerName}'s profile`}
          onKeyDown={handleProfileKeyDown}
        >
          <AvatarImage src={content.provider?.avatar_url} alt="" />
          <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Header Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span 
              className="font-semibold text-xs sm:text-sm truncate cursor-pointer hover:underline"
              onClick={onProfileClick}
              tabIndex={0}
              role="button"
              aria-label={`View ${providerName}'s profile`}
              onKeyDown={handleProfileKeyDown}
            >
              {providerName}
            </span>
            {/* Verified skill badge */}
            {content.provider?.verified_skill && (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 py-0 h-3.5 sm:h-4 text-green-600 border-green-200 shrink-0">
                <CheckCircle className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5" aria-hidden="true" />
                <span className="hidden sm:inline">{content.provider.verified_skill}</span>
              </Badge>
            )}
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 shrink-0">
              <ContentIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" aria-hidden="true" />
              {/* Show industry name for sparks, otherwise show content type */}
              <span className="hidden sm:inline">
                {content.content_type === 'spark' && content.industry_segment?.name
                  ? content.industry_segment.name
                  : contentTypeLabels[content.content_type as keyof typeof contentTypeLabels]}
              </span>
            </Badge>
            {/* Read time badge for articles */}
            {content.content_type === 'article' && content.body_text && (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 h-4 sm:h-5 shrink-0 hidden sm:flex">
                <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" aria-hidden="true" />
                {calculateReadTime(content.body_text)}
              </Badge>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* More Options - accessible trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
              aria-label="Content options"
            >
              <MoreHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Share</DropdownMenuItem>
            <DropdownMenuItem>Copy Link</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="px-3 sm:px-4 py-2 cursor-pointer" onClick={onContentClick}>
        {/* Title (for articles/podcasts) */}
        {content.title && (
          <h3 className="font-semibold text-sm sm:text-base mb-2">{content.title}</h3>
        )}

        {/* Headline (for sparks) */}
        {content.headline && (
          <h3 className="font-bold text-base sm:text-lg mb-2 text-primary">{content.headline}</h3>
        )}

        {/* Media Preview - ensure it scales */}
        {content.media_urls && Array.isArray(content.media_urls) && (content.media_urls as string[]).length > 0 && (
          <div className="mb-2 sm:mb-3 relative flex justify-center">
            <MediaRenderer
              contentType={content.content_type as PulseContentType}
              mediaUrls={content.media_urls as string[]}
              coverImageUrl={content.cover_image_url || undefined}
              title={content.title || content.headline || undefined}
              isPreview
            />
            {/* Video duration badge for reels */}
            {content.content_type === 'reel' && content.duration_seconds && (
              <Badge 
                className="absolute top-2 right-2 bg-black/70 text-white text-xs border-0"
                aria-label={`Duration: ${formatDuration(content.duration_seconds)}`}
              >
                {formatDuration(content.duration_seconds)}
              </Badge>
            )}
          </div>
        )}

        {/* Text Content */}
        {displayText && (
          <div>
            <p className={cn(
              "text-sm text-foreground/90 whitespace-pre-wrap",
              !isExpanded && shouldTruncate && "line-clamp-4"
            )}>
              {displayText}
            </p>
            {/* Spark trend chart for sparks with statistics */}
            {content.content_type === 'spark' && content.key_insight && (
              <SparkTrendChart insightText={content.key_insight} />
            )}
          </div>
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
