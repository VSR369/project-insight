/**
 * PulseCards Feed Page
 * Scrollable list with card-level Read/Contributors toggle per card
 */

import { useState } from 'react';
import { PulseLayout, ProfileBuildBanner } from '@/components/pulse/layout';
import { PulseCardListItem, CreateCardDialog } from '@/components/pulse/cards';
import { usePulseCards } from '@/hooks/queries/usePulseCards';
import { usePulseCardTopics } from '@/hooks/queries/usePulseCardTopics';
import { useIsFirstTimeProvider } from '@/hooks/useIsFirstTimeProvider';
import { usePulseCardsReputation } from '@/hooks/queries/usePulseCardsReputation';
import { PersonalizedFeedHeader } from '@/components/pulse/gamification';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Loader2, Layers, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REPUTATION_GATES } from '@/constants/pulseCards.constants';

export default function PulseCardsPage() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { isFirstTime, provider, isLoading: providerLoading } = useIsFirstTimeProvider();
  const { data: topics, isLoading: topicsLoading } = usePulseCardTopics();
  
  // Derived values for header components
  const providerName = provider 
    ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'there'
    : 'there';
  const profileProgress = provider?.profile_completion_percentage ?? 0;
  const isProfileComplete = profileProgress >= 100;
  
  const { data: cards, isLoading: cardsLoading } = usePulseCards({
    topicId: selectedTopicId,
    status: 'active',
  });
  const { data: reputation } = usePulseCardsReputation(provider?.id);

  const canCreateCard = reputation?.canStartCard ?? false;
  const createCardReason = !canCreateCard 
    ? `Need ${REPUTATION_GATES.START_CARD} reputation to start cards`
    : undefined;

  const handleTopicChange = (value: string) => {
    setSelectedTopicId(value === 'all' ? undefined : value);
  };

  return (
    <PulseLayout isPrimaryPage providerId={provider?.id} showSidebars>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Profile Build Banner - always visible when provider exists */}
        {provider && (
          <div className="px-4 py-3 sm:py-4 border-b shrink-0">
            <ProfileBuildBanner
              profileProgress={profileProgress}
              isProfileComplete={isProfileComplete}
            />
          </div>
        )}

        {/* Personalized Header - returning users only */}
        {!isFirstTime && provider && (
          <div className="shrink-0">
            <PersonalizedFeedHeader
              providerId={provider.id}
              providerName={providerName}
              profileProgress={profileProgress}
              isProfileComplete={isProfileComplete}
            />
          </div>
        )}

        {/* Topic Filter */}
        <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={selectedTopicId || 'all'}
                onValueChange={handleTopicChange}
                disabled={topicsLoading}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {topics?.map((topic) => (
                    <SelectItem key={topic.id} value={topic.id}>
                      {topic.icon && <span className="mr-2">{topic.icon}</span>}
                      {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={!canCreateCard}
              title={createCardReason}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Card
            </Button>
          </div>
        </div>

        {/* Card List with individual Read/Contributors toggles */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {cardsLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading cards...</p>
            </div>
          ) : !cards || cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center p-8">
              <div className="p-4 rounded-full bg-muted">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No cards yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedTopicId 
                    ? 'No cards in this topic. Be the first to contribute!'
                    : 'Start the conversation by creating the first card.'}
                </p>
              </div>
              {canCreateCard && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Card
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {cards.map((card) => (
                <PulseCardListItem
                  key={card.id}
                  card={card}
                  providerId={provider?.id}
                  reputation={reputation?.total || 0}
                  canVote={reputation?.canVote ?? false}
                  canFlag={reputation?.canFlag ?? false}
                  canBuild={reputation?.canBuild ?? false}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Card Dialog */}
      {provider?.id && (
        <CreateCardDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          providerId={provider.id}
        />
      )}
    </PulseLayout>
  );
}
