/**
 * PulseCards Feed Page
 * Swipeable card deck browser following stories-style UX
 */

import { useState } from 'react';
import { PulseLayout } from '@/components/pulse/layout';
import { PulseCardStack, CreateCardDialog } from '@/components/pulse/cards';
import { usePulseCards } from '@/hooks/queries/usePulseCards';
import { usePulseCardTopics } from '@/hooks/queries/usePulseCardTopics';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { usePulseCardsReputation } from '@/hooks/queries/usePulseCardsReputation';
import { Button } from '@/components/ui/button';
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

  const { data: provider } = useCurrentProvider();
  const { data: topics, isLoading: topicsLoading } = usePulseCardTopics();
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
      <div className="flex flex-col h-full">
        {/* Topic Filter */}
        <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

        {/* Card Stack */}
        <div className="flex-1 overflow-hidden p-4">
          {cardsLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading cards...</p>
            </div>
          ) : !cards || cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
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
            <PulseCardStack cards={cards} />
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
