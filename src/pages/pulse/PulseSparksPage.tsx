import { useNavigate } from 'react-router-dom';
import { Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PulseLayout } from '@/components/pulse/layout';
import { usePulseFeed } from '@/hooks/queries/usePulseContent';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useIsFirstTimeProvider } from '@/hooks/useIsFirstTimeProvider';
import { PersonalizedFeedHeader } from '@/components/pulse/gamification';
import { formatDistanceToNow } from 'date-fns';

export default function PulseSparksPage() {
  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const { data: feedContent, isLoading, refetch, isRefetching } = usePulseFeed({ contentType: 'spark' });
  const { isFirstTime, provider: firstTimeProvider } = useIsFirstTimeProvider();

  // Profile progress calculation
  const providerName = firstTimeProvider 
    ? `${firstTimeProvider.first_name || ''} ${firstTimeProvider.last_name || ''}`.trim() || 'there'
    : 'there';
  const profileProgress = firstTimeProvider?.profile_completion_percentage ?? 0;
  const isProfileComplete = profileProgress >= 100;

  if (isLoading) {
    return (
      <PulseLayout title="Sparks" providerId={provider?.id} showSidebars>
        <div className="max-w-lg mx-auto lg:max-w-none p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </PulseLayout>
    );
  }

  const sparks = feedContent ?? [];

  return (
    <PulseLayout title="Sparks" providerId={provider?.id} showSidebars>
      <div className="max-w-lg mx-auto lg:max-w-none">
        {/* Personalized Header with Build/View Profile button */}
        {!isFirstTime && firstTimeProvider && (
          <PersonalizedFeedHeader
            providerId={firstTimeProvider.id}
            providerName={providerName}
            profileProgress={profileProgress}
            isProfileComplete={isProfileComplete}
          />
        )}

        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Knowledge Sparks
              </h2>
              <p className="text-sm text-muted-foreground">Quick insights from experts</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button className="w-full" onClick={() => navigate('/pulse/create', { state: { type: 'spark' } })}>
            <Zap className="h-4 w-4 mr-2" />
            Share a Spark
          </Button>
        </div>

        {sparks.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Sparks Yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {sparks.map((spark) => (
              <Card key={spark.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pulse/content/${spark.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge variant="secondary"><Zap className="h-3 w-3 mr-1" />Spark</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(spark.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {spark.headline && <h3 className="font-bold text-primary mb-2">{spark.headline}</h3>}
                  {spark.key_insight && <p className="text-sm line-clamp-3">{spark.key_insight}</p>}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>🔥 {spark.fire_count}</span>
                    <span>💬 {spark.comment_count}</span>
                    <span>🥇 {spark.gold_count}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PulseLayout>
  );
}
