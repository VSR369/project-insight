import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Grid3X3, Bookmark, Trophy, Edit } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PulseLayout } from '@/components/pulse/layout';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProviderStats } from '@/hooks/queries/usePulseStats';
import { useMyPulseContent } from '@/hooks/queries/usePulseContent';
import { useFollowers, useFollowing } from '@/hooks/queries/usePulseSocial';
import { useBookmarkedContent } from '@/hooks/queries/usePulseEngagements';

export default function PulseProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: stats, isLoading: statsLoading } = useProviderStats(provider?.id);
  const { data: content, isLoading: contentLoading } = useMyPulseContent(provider?.id);
  const { data: followers } = useFollowers(provider?.id);
  const { data: following } = useFollowing(provider?.id);
  const { data: bookmarks } = useBookmarkedContent(provider?.id);

  const isLoading = providerLoading || statsLoading;
  const providerName = provider ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Anonymous' : 'Anonymous';
  const initials = providerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (isLoading) {
    return (
      <PulseLayout title="Profile">
        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48" /></div>
          </div>
        </div>
      </PulseLayout>
    );
  }

  if (!provider) {
    return <PulseLayout title="Profile"><div className="max-w-lg mx-auto p-4 text-center py-16"><p className="text-muted-foreground">Please complete your profile.</p></div></PulseLayout>;
  }

  return (
    <PulseLayout title="Profile">
      <div className="max-w-lg mx-auto">
        <div className="p-4 border-b">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-20 w-20 ring-2 ring-primary/20">
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-xl truncate">{providerName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary"><Trophy className="h-3 w-3 mr-1" />Level {stats?.current_level || 1}</Badge>
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={() => navigate('/settings')}><Settings className="h-4 w-4" /></Button>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2"><p className="font-bold text-lg">{stats?.total_contributions || 0}</p><p className="text-xs text-muted-foreground">Posts</p></div>
            <div className="p-2"><p className="font-bold text-lg">{followers?.length || 0}</p><p className="text-xs text-muted-foreground">Followers</p></div>
            <div className="p-2"><p className="font-bold text-lg">{following?.length || 0}</p><p className="text-xs text-muted-foreground">Following</p></div>
            <div className="p-2"><p className="font-bold text-lg">{stats?.total_xp?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">XP</p></div>
          </div>
          <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/profile')}><Edit className="h-4 w-4 mr-2" />Edit Profile</Button>
        </div>

        <Card className="m-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Gold Tokens</p><p className="text-2xl font-bold">🥇 {stats?.gold_token_balance || 0}</p></div>
              <div className="text-right"><p className="text-sm text-muted-foreground">Total Fires</p><p className="text-lg font-semibold text-orange-500">{stats?.total_fire_received || 0} 🔥</p></div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4"><TabsList className="w-full"><TabsTrigger value="posts" className="flex-1"><Grid3X3 className="h-4 w-4" /></TabsTrigger><TabsTrigger value="saved" className="flex-1"><Bookmark className="h-4 w-4" /></TabsTrigger></TabsList></div>
          <TabsContent value="posts" className="mt-0">
            {contentLoading ? <div className="p-4"><Skeleton className="h-24 w-full" /></div> : 
              !content || content.length === 0 ? <div className="text-center py-12 px-4"><Grid3X3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No posts yet</p></div> :
              <div className="p-4 space-y-2">{content.map(item => <Card key={item.id} className="p-3 cursor-pointer" onClick={() => navigate(`/pulse/content/${item.id}`)}><p className="text-sm font-medium">{item.title || item.headline || item.caption?.slice(0, 50)}</p></Card>)}</div>}
          </TabsContent>
          <TabsContent value="saved" className="mt-0">
            {!bookmarks || bookmarks.length === 0 ? <div className="text-center py-12 px-4"><Bookmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No saved posts</p></div> :
              <div className="p-4 space-y-2">{bookmarks.map(b => <Card key={b.id} className="p-3"><p className="text-sm">Saved content</p></Card>)}</div>}
          </TabsContent>
        </Tabs>
      </div>
    </PulseLayout>
  );
}
