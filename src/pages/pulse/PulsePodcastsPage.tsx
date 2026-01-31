import { useNavigate } from 'react-router-dom';
import { Mic, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PulseLayout } from '@/components/pulse/layout';
import { usePulseFeed } from '@/hooks/queries/usePulseContent';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { formatDistanceToNow } from 'date-fns';

export default function PulsePodcastsPage() {
  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const { data: feedContent, isLoading, refetch, isRefetching } = usePulseFeed({ contentType: 'podcast' });

  if (isLoading) {
    return (
      <PulseLayout title="Podcasts" providerId={provider?.id} showSidebars>
        <div className="max-w-lg mx-auto lg:max-w-none p-4 space-y-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </PulseLayout>
    );
  }

  const podcasts = feedContent ?? [];

  return (
    <PulseLayout title="Podcasts" providerId={provider?.id} showSidebars>
      <div className="max-w-lg mx-auto lg:max-w-none">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Mic className="h-5 w-5 text-purple-500" />
                Podcasts
              </h2>
              <p className="text-sm text-muted-foreground">Audio content from experts</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button className="w-full" onClick={() => navigate('/pulse/create', { state: { type: 'podcast' } })}>
            <Mic className="h-4 w-4 mr-2" />
            Share a Podcast
          </Button>
        </div>

        {podcasts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Podcasts Yet</p>
            <p className="text-sm text-muted-foreground">Be the first to share audio content</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {podcasts.map((podcast) => (
              <Card key={podcast.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pulse/content/${podcast.id}`)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                      <Mic className="h-3 w-3 mr-1" />Podcast
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(podcast.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {podcast.title && <h3 className="font-bold text-primary mb-2">{podcast.title}</h3>}
                  {podcast.caption && <p className="text-sm line-clamp-2 text-muted-foreground">{podcast.caption}</p>}
                  {podcast.duration_seconds && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Duration: {Math.floor(podcast.duration_seconds / 60)}:{(podcast.duration_seconds % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>🔥 {podcast.fire_count}</span>
                    <span>💬 {podcast.comment_count}</span>
                    <span>🥇 {podcast.gold_count}</span>
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
