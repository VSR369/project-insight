/**
 * PulseCard Detail Page
 * Dual-view wiki system: Read (compiled) vs Contributors (individual)
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PulseLayout } from '@/components/pulse/layout';
import { 
  ViewModeToggle, 
  CompiledView, 
  ContributorsView,
  CreateLayerDialog, 
  FlagCardDialog,
  type ViewMode,
} from '@/components/pulse/cards';
import { usePulseCard, useIncrementCardView } from '@/hooks/queries/usePulseCards';
import { usePulseCardLayers } from '@/hooks/queries/usePulseCardLayers';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { usePulseCardsReputation } from '@/hooks/queries/usePulseCardsReputation';
import { useCastVote, useUserVote } from '@/hooks/queries/usePulseCardVotes';
import { useCompileCardNarrative, extractContributors } from '@/hooks/queries/useCompiledNarrative';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { REPUTATION_GATES } from '@/constants/pulseCards.constants';
import { 
  Layers, 
  ArrowLeft, 
  Eye,
  Share2,
  Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PulseCardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('compiled');
  const [isCreateLayerOpen, setIsCreateLayerOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [flagTarget, setFlagTarget] = useState<{ type: 'card' | 'layer'; id: string } | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  
  // Data hooks
  const { data: provider } = useCurrentProvider();
  const { data: card, isLoading: cardLoading } = usePulseCard(cardId);
  const { data: layers, isLoading: layersLoading } = usePulseCardLayers(cardId);
  const { data: reputation } = usePulseCardsReputation(provider?.id);
  const incrementView = useIncrementCardView();
  const castVote = useCastVote();
  const compileNarrative = useCompileCardNarrative();

  // Permissions
  const canBuild = reputation?.canBuild ?? false;
  const canVote = reputation?.canVote ?? false;
  const canFlag = reputation?.canFlag ?? false;
  const buildReason = !canBuild 
    ? `Need ${REPUTATION_GATES.BUILD_ON_CARD} reputation to build on cards`
    : undefined;

  // Extract unique contributors from layers
  const contributors = useMemo(() => {
    return layers ? extractContributors(layers) : [];
  }, [layers]);

  // Featured layer
  const featuredLayer = useMemo(() => {
    return layers?.find(l => l.is_featured) || null;
  }, [layers]);

  // Handle flag actions
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

  // Auto-compile if stale or missing
  useEffect(() => {
    if (card && cardId && layers && layers.length > 0) {
      const needsCompilation = 
        !card.compiled_narrative || 
        card.compilation_stale === true;
      
      if (needsCompilation && !compileNarrative.isPending) {
        compileNarrative.mutate(cardId);
      }
    }
  }, [card, cardId, layers]);

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

  const handleRecompile = () => {
    if (cardId) {
      compileNarrative.mutate(cardId);
    }
  };

  const handleViewHistory = () => {
    // Switch to contributors view to show history
    setViewMode('contributors');
  };

  if (cardLoading) {
    return (
      <PulseLayout title="Card" showBackButton>
        <div className="p-4 space-y-4">
          <Skeleton className="h-10 w-48 mx-auto rounded-full" />
          <Skeleton className="h-48 w-full rounded-xl" />
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

  const hasLayers = layers && layers.length > 0;
  const compiledNarrative = card.compiled_narrative || null;
  const compiledAt = card.compiled_at || null;
  const isStale = card.compilation_stale === true;

  return (
    <PulseLayout title={card.topic?.name || 'Card'} showBackButton>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-4 pb-24">
          {/* Header with Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {card.topic?.name && (
                <Badge variant="secondary" className="font-medium">
                  {card.topic.name}
                </Badge>
              )}
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

          {/* View Mode Toggle */}
          <div className="flex justify-center">
            <ViewModeToggle
              value={viewMode}
              onChange={setViewMode}
              disabled={!hasLayers}
            />
          </div>

          {/* Content Area with Animation */}
          <div 
            role="tabpanel" 
            id="view-panel"
            className={cn(
              "transition-opacity duration-300 ease-in-out",
              "animate-in fade-in-0 slide-in-from-bottom-2"
            )}
            key={viewMode}
          >
            {viewMode === 'compiled' ? (
              <CompiledView
                narrative={compiledNarrative}
                compiledAt={compiledAt}
                isStale={isStale}
                contributors={contributors}
                layerCount={layers?.length || 0}
                isLoading={layersLoading}
                isCompiling={compileNarrative.isPending}
                onRecompile={handleRecompile}
                onImprove={() => setIsCreateLayerOpen(true)}
                onViewHistory={handleViewHistory}
                fallbackReason={undefined}
              />
            ) : (
              <ContributorsView
                layers={layers || []}
                featuredLayer={featuredLayer}
                providerId={provider?.id}
                reputation={reputation?.total || 0}
                canVote={canVote}
                canFlag={canFlag}
                onVote={handleVote}
                onBuild={() => setIsCreateLayerOpen(true)}
                onFlagLayer={handleFlagLayer}
                userVotes={userVotes}
                seedCreator={card.creator}
                cardCreatedAt={card.created_at}
              />
            )}
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

// Layer voting wrapper removed - now handled in ContributorsView
