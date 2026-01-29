/**
 * Pulse Public Profile Page
 * View another user's profile
 * Per Phase 8 specification
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Grid3X3, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PulseLayout } from '@/components/pulse/layout';
import { ContentCard } from '@/components/pulse/content';
import { usePulseFeed } from '@/hooks/queries/usePulseContent';
import { useProviderStats } from '@/hooks/queries/usePulseStats';
import { useFollowers, useFollowing, useToggleFollow, useIsFollowing } from '@/hooks/queries/usePulseSocial';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PulsePublicProfilePage() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();

  const { data: currentProvider } = useCurrentProvider();

  // Fetch the profile provider
  const { data: profileProvider, isLoading: providerLoading, error: providerError } = useQuery({
    queryKey: ['provider-profile', providerId],
    queryFn: async () => {
      if (!providerId) return null;
      const { data, error } = await supabase
        .from('solution_providers')
        .select('id, first_name, last_name')
        .eq('id', providerId)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!providerId,
  });

  const { data: stats, isLoading: statsLoading } = useProviderStats(providerId);
  const { data: content, isLoading: contentLoading } = usePulseFeed({ providerId, limit: 20 });
  const { data: followers } = useFollowers(providerId);
  const { data: following } = useFollowing(providerId);
  const { data: isFollowing } = useIsFollowing(currentProvider?.id, providerId);
  
  const toggleFollow = useToggleFollow();

  const isOwnProfile = currentProvider?.id === providerId;
  const isLoading = providerLoading || statsLoading;

  const handleFollowToggle = () => {
    if (!currentProvider?.id || !providerId) return;
    toggleFollow.mutate({ followerId: currentProvider.id, followingId: providerId });
  };

  const handleContentClick = (contentId: string) => {
    navigate(`/pulse/content/${contentId}`);
  };

  const handleCommentClick = (contentId: string) => {
    navigate(`/pulse/content/${contentId}#comments`);
  };

  if (isLoading) {
    return (
      <PulseLayout>
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </div>
      </PulseLayout>
    );
  }

  if (providerError || !profileProvider) {
    return (
      <PulseLayout>
        <div className="max-w-lg mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert variant="destructive">
            <AlertDescription>
              {providerError?.message || 'User not found.'}
            </AlertDescription>
          </Alert>
        </div>
      </PulseLayout>
    );
  }

  const providerName = `${profileProvider.first_name || ''} ${profileProvider.last_name || ''}`.trim() || 'Anonymous';
  const initials = providerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Transform content tags
  const transformedContent = content?.map(c => ({
    ...c,
    tags: c.tags?.map(t => t.tag) ?? [],
  }));

  return (
    <PulseLayout>
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
            <h1 className="font-semibold flex-1">{providerName}</h1>
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-4 border-b">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-xl truncate">{providerName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  <Trophy className="h-3 w-3 mr-1" />
                  Level {stats?.current_level || 1}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center mb-4">
            <div className="p-2">
              <p className="font-bold text-lg">{stats?.total_contributions || 0}</p>
              <p className="text-xs text-muted-foreground">Posts</p>
            </div>
            <div className="p-2">
              <p className="font-bold text-lg">{followers?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="p-2">
              <p className="font-bold text-lg">{following?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
            <div className="p-2">
              <p className="font-bold text-lg">{stats?.total_xp?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">XP</p>
            </div>
          </div>

          {/* Action Button */}
          {!isOwnProfile && currentProvider && (
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              className="w-full"
              onClick={handleFollowToggle}
              disabled={toggleFollow.isPending}
            >
              {toggleFollow.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isFollowing ? (
                <UserMinus className="h-4 w-4 mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}

          {isOwnProfile && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/pulse/profile')}
            >
              View Your Profile
            </Button>
          )}
        </div>

        {/* XP Card */}
        <Card className="m-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total XP</p>
                <p className="text-2xl font-bold">{stats?.total_xp?.toLocaleString() || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Fires Received</p>
                <p className="text-lg font-semibold text-orange-500">
                  {stats?.total_fire_received || 0} 🔥
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content List */}
        <div className="px-4 pb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
            <Grid3X3 className="h-4 w-4" />
            Posts
          </h3>
        </div>

        {contentLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : !transformedContent || transformedContent.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Grid3X3 className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No posts yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transformedContent.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                currentUserProviderId={currentProvider?.id || ''}
                onContentClick={() => handleContentClick(item.id)}
                onProfileClick={() => {}} // Already on profile
                onCommentClick={() => handleCommentClick(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PulseLayout>
  );
}
