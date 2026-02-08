/**
 * PulseCardListItem - Single card with inline Read/Contributors toggle
 * Each card manages its own view mode state independently
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewModeToggle, type ViewMode } from './ViewModeToggle';
import { CompiledView } from './CompiledView';
import { ContributorsView } from './ContributorsView';
import { ContributorAvatars, type Contributor } from './ContributorAvatars';
import { CreateLayerDialog } from './CreateLayerDialog';
import { FlagCardDialog } from './FlagCardDialog';
import type { PulseCard } from '@/hooks/queries/usePulseCards';
import { usePulseCardLayers, type PulseCardLayer } from '@/hooks/queries/usePulseCardLayers';
import { useCastVote } from '@/hooks/queries/usePulseCardVotes';
import { Eye, Layers, Share2, Flag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PulseCardListItemProps {
  card: PulseCard;
  providerId?: string;
  reputation: number;
  canVote: boolean;
  canFlag: boolean;
  canBuild: boolean;
}

export function PulseCardListItem({
  card,
  providerId,
  reputation,
  canVote,
  canFlag,
  canBuild,
}: PulseCardListItemProps) {
  // Card-level view mode state (each card has its own toggle)
  const [viewMode, setViewMode] = useState<ViewMode>('compiled');
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down' | null>>({});

  // Fetch layers for this specific card
  const { data: layers, isLoading: layersLoading } = usePulseCardLayers(card.id);
  const castVote = useCastVote();

  // Derive featured layer and contributors
  const featuredLayer = useMemo(() => {
    return layers?.find((l) => l.is_featured) || null;
  }, [layers]);

  const contributors = useMemo((): Contributor[] => {
    if (!layers) return [];
    const uniqueCreators = new Map<string, Contributor>();
    layers.forEach((layer) => {
      if (layer.creator && !uniqueCreators.has(layer.creator.id)) {
        uniqueCreators.set(layer.creator.id, {
          id: layer.creator.id,
          first_name: layer.creator.first_name,
          last_name: layer.creator.last_name,
        });
      }
    });
    return Array.from(uniqueCreators.values());
  }, [layers]);

  // Handlers
  const handleVote = (layerId: string, voteType: 'up' | 'down') => {
    if (!providerId) return;
    
    castVote.mutate({
      layerId,
      voterId: providerId,
      voteType,
      voterReputation: reputation,
      cardId: card.id,
    });

    // Optimistic UI update
    setUserVotes((prev) => ({
      ...prev,
      [layerId]: prev[layerId] === voteType ? null : voteType,
    }));
  };

  const handleImprove = () => {
    setIsLayerDialogOpen(true);
  };

  const handleFlag = () => {
    setIsFlagDialogOpen(true);
  };

  const handleFlagLayer = (layerId: string) => {
    // TODO: Open flag dialog for specific layer
    console.log('Flag layer:', layerId);
  };

  const handleViewHistory = () => {
    // TODO: Implement build history modal
    console.log('View history for card:', card.id);
  };

  const handleRecompile = () => {
    // TODO: Trigger recompilation via edge function
    console.log('Recompile narrative for card:', card.id);
  };

  // Loading state for layers
  const isLoading = layersLoading;

  return (
    <article 
      className="bg-card border border-border rounded-xl shadow-sm overflow-hidden"
      data-testid={`pulse-card-${card.id}`}
    >
      {/* Header: Topic + Stats + Flag */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Topic Badge */}
          {card.topic && (
            <Badge variant="secondary" className="text-sm">
              {card.topic.icon && <span className="mr-1">{card.topic.icon}</span>}
              {card.topic.name}
            </Badge>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {card.view_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              {card.build_count || layers?.length || 0}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-3.5 w-3.5" />
              {card.share_count || 0}
            </span>
          </div>
        </div>

        {/* Flag Button */}
        {canFlag && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleFlag}
            title="Report this card"
          >
            <Flag className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center py-4 px-4 border-b border-border">
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          disabled={isLoading}
        />
      </div>

      {/* Content Area */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading content...</span>
          </div>
        ) : viewMode === 'compiled' ? (
          <CompiledView
            narrative={card.compiled_narrative}
            compiledAt={card.compiled_at}
            isStale={card.compilation_stale}
            contributors={contributors}
            layerCount={layers?.length || 0}
            isLoading={false}
            isCompiling={false}
            onRecompile={handleRecompile}
            onImprove={handleImprove}
            onViewHistory={handleViewHistory}
          />
        ) : (
          <ContributorsView
            layers={layers || []}
            featuredLayer={featuredLayer}
            providerId={providerId}
            reputation={reputation}
            canVote={canVote}
            canFlag={canFlag}
            onVote={handleVote}
            onBuild={handleImprove}
            onFlagLayer={handleFlagLayer}
            userVotes={userVotes}
            seedCreator={card.creator}
            cardCreatedAt={card.created_at}
          />
        )}
      </div>

      {/* Dialogs */}
      {providerId && (
        <>
          <CreateLayerDialog
            open={isLayerDialogOpen}
            onOpenChange={setIsLayerDialogOpen}
            cardId={card.id}
            providerId={providerId}
          />
          <FlagCardDialog
            open={isFlagDialogOpen}
            onOpenChange={setIsFlagDialogOpen}
            targetType="card"
            targetId={card.id}
            providerId={providerId}
          />
        </>
      )}
    </article>
  );
}
