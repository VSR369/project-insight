/**
 * PulseCard Detail Page
 * Shows card with all layers and voting interface
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PulseLayout } from '@/components/pulse/layout';
import { PulseCardLayer, CreateLayerDialog, FlagCardDialog } from '@/components/pulse/cards';
import { usePulseCard, useIncrementCardView } from '@/hooks/queries/usePulseCards';
import { usePulseCardLayers } from '@/hooks/queries/usePulseCardLayers';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { usePulseCardsReputation } from '@/hooks/queries/usePulseCardsReputation';
import { useCastVote, useUserVote } from '@/hooks/queries/usePulseCardVotes';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { REPUTATION_GATES } from '@/constants/pulseCards.constants';
import { 
  Layers, 
  Plus, 
  ArrowLeft, 
  Clock, 
  Eye,
  Share2,
  Crown,
  Flag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PulseCardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const [isCreateLayerOpen, setIsCreateLayerOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [flagTarget, setFlagTarget] = useState<{ type: 'card' | 'layer'; id: string } | null>(null);
  const { data: provider } = useCurrentProvider();
  const { data: card, isLoading: cardLoading } = usePulseCard(cardId);
  const { data: layers, isLoading: layersLoading } = usePulseCardLayers(cardId);
  const { data: reputation } = usePulseCardsReputation(provider?.id);
  const incrementView = useIncrementCardView();
  const castVote = useCastVote();

  const canBuild = reputation?.canBuild ?? false;
  const canVote = reputation?.canVote ?? false;
  const canFlag = reputation?.canFlag ?? false;
  const buildReason = !canBuild 
    ? `Need ${REPUTATION_GATES.BUILD_ON_CARD} reputation to build on cards`
    : undefined;

  const handleFlagCard = () => {
    if (cardId) {
      setFlagTarget({ type: 'card', id: cardId });
      setIsFlagDialogOpen(true);
    }
  };

  const handleFlagLayer = (layerId: string) => {
    setFlagTarget({ type: 'layer', id: layerId });
    setIsFlagDialogOpen(true);
  };

  // Track view on mount
  useEffect(() => {
    if (cardId) {
      incrementView.mutate(cardId);
    }
  }, [cardId]);

  const handleVote = (layerId: string, voteType: 'up' | 'down') => {
    if (!provider?.id || !cardId) return;
    
    castVote.mutate({
      layerId,
      voterId: provider.id,
      voteType,
      voterReputation: reputation?.total || 0,
      cardId,
    });
  };

  if (cardLoading) {
    return (
      <PulseLayout title="Card" showBackButton>
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </PulseLayout>
    );
  }

  if (!card) {
    return (
      <PulseLayout title="Card" showBackButton>
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Layers className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Card not found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This card may have been removed or archived.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/pulse/cards')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cards
          </Button>
        </div>
      </PulseLayout>
    );
  }

  // Separate featured layer from others
  const featuredLayer = layers?.find(l => l.is_featured);
  const otherLayers = layers?.filter(l => !l.is_featured) || [];

  return (
    <PulseLayout title={card.topic?.name || 'Card'} showBackButton>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4 pb-24">
          {/* Card Header with Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Eye className="h-3 w-3" />
                {card.view_count}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Layers className="h-3 w-3" />
                {card.build_count} builds
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Share2 className="h-3 w-3" />
                {card.share_count}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(card.created_at), { addSuffix: true })}
              </span>
              {canFlag && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={handleFlagCard}
                  title="Report this card"
                >
                  <Flag className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Featured Layer (Current Best Answer) */}
          {featuredLayer && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Featured Version</span>
              </div>
              <LayerWithVoting 
                layer={featuredLayer}
                providerId={provider?.id}
                reputation={reputation?.total || 0}
                canVote={canVote}
                onVote={handleVote}
              />
            </div>
          )}

          {/* Build Button */}
          <Button
            className="w-full"
            onClick={() => setIsCreateLayerOpen(true)}
            disabled={!canBuild}
            title={buildReason}
          >
            <Plus className="h-4 w-4 mr-2" />
            Build on this Card
          </Button>

          <Separator />

          {/* Other Layers */}
          {otherLayers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Other Contributions ({otherLayers.length})
              </h3>
              
              {layersLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-3">
                  {otherLayers.map((layer) => (
                    <LayerWithVoting 
                      key={layer.id}
                      layer={layer}
                      providerId={provider?.id}
                      reputation={reputation?.total || 0}
                      canVote={canVote}
                      onVote={handleVote}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Original Seed Info */}
          <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                Card started by{' '}
                <span className="font-medium text-foreground">
                  {card.creator?.first_name} {card.creator?.last_name}
                </span>
              </span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Create Layer Dialog */}
      {provider?.id && cardId && (
        <CreateLayerDialog
          open={isCreateLayerOpen}
          onOpenChange={setIsCreateLayerOpen}
          cardId={cardId}
          providerId={provider.id}
        />
      )}

      {/* Flag Dialog */}
      {provider?.id && flagTarget && (
        <FlagCardDialog
          open={isFlagDialogOpen}
          onOpenChange={(open) => {
            setIsFlagDialogOpen(open);
            if (!open) setFlagTarget(null);
          }}
          targetType={flagTarget.type}
          targetId={flagTarget.id}
          providerId={provider.id}
        />
      )}
    </PulseLayout>
  );
}

// Helper component for layer with voting state
function LayerWithVoting({
  layer,
  providerId,
  reputation,
  canVote,
  onVote,
}: {
  layer: NonNullable<ReturnType<typeof usePulseCardLayers>['data']>[0];
  providerId?: string;
  reputation: number;
  canVote: boolean;
  onVote: (layerId: string, voteType: 'up' | 'down') => void;
}) {
  const { data: userVote } = useUserVote(layer.id, providerId);
  
  return (
    <PulseCardLayer
      layer={layer}
      reputation={reputation}
      userVote={userVote?.vote_type as 'up' | 'down' | null}
      canVote={canVote}
      onVote={(voteType) => onVote(layer.id, voteType)}
    />
  );
}
