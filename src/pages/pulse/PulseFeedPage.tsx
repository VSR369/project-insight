import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle, Rss, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PulseLayout, ProfileBuildBanner } from '@/components/pulse/layout';
import { ContentCard, PulseCardFeedItem } from '@/components/pulse/content';
import { DailyStandupBanner, PersonalizedFeedHeader } from '@/components/pulse/gamification';
import { StartPostWidget } from '@/components/pulse/widgets';
import { useUnifiedPulseFeed } from '@/hooks/queries/useUnifiedPulseFeed';
import { useIsFirstTimeProvider } from '@/hooks/useIsFirstTimeProvider';

export default function PulseFeedPage() {
  const navigate = useNavigate();
  const { isFirstTime, isLoading: firstTimeLoading, provider } = useIsFirstTimeProvider();
  const { data: feedItems, isLoading, isRefetching, refetch, error } = useUnifiedPulseFeed();

  const handleContentClick = (contentId: string) => {
    navigate(`/pulse/content/${contentId}`);
  };

  const handleCardClick = (cardId: string) => {
    navigate(`/pulse/cards/${cardId}`);
  };

  const handleProfileClick = (providerId: string) => {
    navigate(`/pulse/profile/${providerId}`);
  };

  const handleCommentClick = (contentId: string) => {
    navigate(`/pulse/content/${contentId}#comments`);
  };

  // Loading state
  if (firstTimeLoading) {
    return (
      <PulseLayout showSidebars={false}>
        <div className="w-full px-2 sm:px-4 lg:px-0 lg:max-w-2xl lg:mx-auto space-y-4" aria-label="Loading feed">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3 p-3 sm:p-4 border-b">
              <div className="flex gap-2 sm:gap-3">
                <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 sm:w-32" />
                  <Skeleton className="h-3 w-16 sm:w-20" />
                </div>
              </div>
              <Skeleton className="h-32 sm:h-40 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </PulseLayout>
    );
  }

  // Error state with retry
  if (error) {
    return (
      <PulseLayout 
        providerId={provider?.id} 
        isFirstTime={isFirstTime}
        showSidebars={true}
      >
        <div className="w-full px-2 sm:px-4 lg:px-0 lg:max-w-2xl lg:mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load feed</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">Something went wrong while loading your feed.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </PulseLayout>
    );
  }

  // Provider name from available fields
  const providerName = provider 
    ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'there'
    : 'there';

  return (
    <PulseLayout 
      isPrimaryPage={true}
      providerId={provider?.id} 
      isFirstTime={isFirstTime}
      showSidebars={true}
    >
      <div className="w-full">
        {/* First-time user: Show profile build banner */}
        {isFirstTime && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-b">
            <ProfileBuildBanner />
          </div>
        )}

        {/* Start a Post widget - all users with provider */}
        {provider && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-b">
            <StartPostWidget
              providerId={provider.id}
              providerName={providerName}
              isFirstTime={isFirstTime}
            />
          </div>
        )}

        {/* Personalized Header - only show for returning users with provider */}
        {!isFirstTime && provider && (
          <PersonalizedFeedHeader
            providerId={provider.id}
            providerName={providerName}
          />
        )}

        {/* Daily Standup Banner - only for returning users on mobile (desktop shows in sidebar) */}
        {!isFirstTime && provider && (
          <div className="px-2 sm:px-4 py-3 sm:py-4 border-b lg:hidden">
            <DailyStandupBanner providerId={provider.id} />
          </div>
        )}

        {/* Feed Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between px-2 sm:px-4 py-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" aria-hidden="true" />
              <span className="font-medium text-xs sm:text-sm">
                {isFirstTime ? 'INDUSTRY PULSE' : 'YOUR FEED'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => refetch()}
              disabled={isRefetching}
              aria-label={isRefetching ? 'Refreshing feed' : 'Refresh feed'}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              {isRefetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="px-2 sm:px-4 py-4 space-y-4" aria-label="Loading content">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-3 p-3 sm:p-4 border rounded-lg">
                <div className="flex gap-2 sm:gap-3">
                  <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24 sm:w-32" />
                    <Skeleton className="h-3 w-16 sm:w-20" />
                  </div>
                </div>
                <Skeleton className="h-32 sm:h-40 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-7 sm:h-8 w-14 sm:w-16" />
                  <Skeleton className="h-7 sm:h-8 w-14 sm:w-16" />
                  <Skeleton className="h-7 sm:h-8 w-14 sm:w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : !feedItems || feedItems.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Rss className="h-7 w-7 sm:h-8 sm:w-8 text-primary" aria-hidden="true" />
            </div>
            <p className="text-base sm:text-lg font-medium mb-2">
              {isFirstTime ? 'Welcome to Industry Pulse!' : 'Your feed is empty'}
            </p>
            <p className="text-muted-foreground text-sm mb-6">
              {isFirstTime 
                ? 'Explore what other solution providers are sharing. Build your profile to start creating content.'
                : 'Follow people or create content to see updates here.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isFirstTime ? (
                <Button onClick={() => navigate('/welcome')}>
                  Build Your Profile
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate('/pulse/create')}>
                    Create Your First Post
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/pulse/ranks')}>
                    Discover Creators
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border" role="feed" aria-label="Content feed">
            {feedItems.map((item) => {
              if (item.type === 'card' && item.card) {
                return (
                  <PulseCardFeedItem
                    key={`card-${item.id}`}
                    card={item.card}
                    currentUserProviderId={provider?.id || ''}
                    onCardClick={() => handleCardClick(item.id)}
                    onProfileClick={() => handleProfileClick(item.card!.seed_creator_id)}
                  />
                );
              }
              
              if (item.type === 'content' && item.content) {
                return (
                  <ContentCard
                    key={`content-${item.id}`}
                    content={item.content as any}
                    currentUserProviderId={provider?.id || ''}
                    onContentClick={() => handleContentClick(item.id)}
                    onProfileClick={() => handleProfileClick(item.content!.provider_id)}
                    onCommentClick={() => handleCommentClick(item.id)}
                  />
                );
              }
              
              return null;
            })}
          </div>
        )}
      </div>
    </PulseLayout>
  );
}
