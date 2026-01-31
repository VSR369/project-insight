/**
 * Pulse Content Detail Page
 * Full view of a single piece of content with comments
 * Per Phase 8 specification
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Share2, Flag, MoreHorizontal, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PulseLayout } from '@/components/pulse/layout';
import { EngagementBar, CommentSection } from '@/components/pulse/content';
import { MediaRenderer } from '@/components/pulse/content/MediaRenderer';
import { usePulseContentDetail } from '@/hooks/queries/usePulseContent';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { PULSE_CONTENT_TYPE_LABELS } from '@/constants/pulse.constants';
import type { PulseContentType } from '@/constants/pulse.constants';

export default function PulseContentDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();

  const { data: provider } = useCurrentProvider();
  const { data: content, isLoading, error } = usePulseContentDetail(contentId);

  // Scroll to comments if hash is #comments
  useEffect(() => {
    if (window.location.hash === '#comments') {
      setTimeout(() => {
        document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  }, [content]);

  if (isLoading) {
    return (
      <PulseLayout>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-20 w-full" />
        </div>
      </PulseLayout>
    );
  }

  if (error || !content) {
    return (
      <PulseLayout>
        <div className="max-w-lg mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>
              {error?.message || 'Content not found or has been removed.'}
            </AlertDescription>
          </Alert>
        </div>
      </PulseLayout>
    );
  }

  const providerName = content.provider
    ? `${content.provider.first_name || ''} ${content.provider.last_name || ''}`.trim() || 'Anonymous'
    : 'Anonymous';
  const initials = providerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const contentTypeLabel = PULSE_CONTENT_TYPE_LABELS[content.content_type as PulseContentType] || content.content_type;
  const displayText = content.content_type === 'spark' 
    ? content.key_insight 
    : content.content_type === 'article' 
      ? content.body_text 
      : content.caption;

  // Transform tags from {tag: {id, name}}[] to {id, name}[]
  const tags = content.tags?.map(t => t.tag) || [];

  // Determine parent route based on content type
  const getParentRoute = () => {
    switch (content.content_type) {
      case 'spark':
        return '/pulse/sparks';
      case 'reel':
        return '/pulse/reels';
      default:
        return '/pulse/feed';
    }
  };

  return (
    <PulseLayout parentRoute={getParentRoute()}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 p-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold flex-1">
              {contentTypeLabel}
            </h1>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More options">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(window.location.href)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Flag className="h-4 w-4 mr-2" />
                  Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Author Info */}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <Avatar
              className="h-12 w-12 cursor-pointer ring-2 ring-border"
              onClick={() => navigate(`/pulse/profile/${content.provider_id}`)}
            >
              <AvatarImage src={undefined} alt="" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <button
                className="font-semibold text-base hover:underline text-left"
                onClick={() => navigate(`/pulse/profile/${content.provider_id}`)}
              >
                {providerName}
              </button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}
              </div>
            </div>
            <Badge variant="secondary">
              {contentTypeLabel}
            </Badge>
          </div>

          {/* Title/Headline */}
          {content.title && (
            <h2 className="text-xl font-bold mb-3">{content.title}</h2>
          )}
          {content.headline && (
            <div className="flex items-start gap-2 mb-3">
              <Zap className="h-5 w-5 text-primary mt-1" />
              <h2 className="text-xl font-bold text-primary">{content.headline}</h2>
            </div>
          )}

          {/* Media */}
          {content.media_urls && (content.media_urls as string[]).length > 0 && (
          <div className="mb-4">
              <MediaRenderer
                contentType={content.content_type as PulseContentType}
                mediaUrls={content.media_urls as string[]}
                coverImageUrl={content.cover_image_url || undefined}
                title={content.title || content.headline || undefined}
              />
            </div>
          )}

          {/* Text Content */}
          {displayText && (
            <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
              <p className="whitespace-pre-wrap text-foreground/90">{displayText}</p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Engagement Stats */}
          <div className="py-2 border-t border-b">
            <EngagementBar
              contentId={content.id}
              providerId={content.provider_id}
              currentUserProviderId={provider?.id || ''}
              fireCount={content.fire_count}
              commentCount={content.comment_count}
              goldCount={content.gold_count}
              saveCount={content.save_count}
              showCounts
            />
          </div>
        </div>

        <Separator />

        {/* Comments Section */}
        <div id="comments-section">
          <CommentSection
            contentId={content.id}
            currentUserProviderId={provider?.id || ''}
          />
        </div>
      </div>
    </PulseLayout>
  );
}
