/**
 * ContributorsView - Individual contribution cards with voting
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PulseCardLayer } from './PulseCardLayer';
import type { PulseCardLayer as LayerType } from '@/hooks/queries/usePulseCardLayers';
import { Plus, Layers, ChevronDown, ChevronUp, Crown, Clock, Flag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContributorsViewProps {
  layers: LayerType[];
  featuredLayer: LayerType | null;
  providerId?: string;
  reputation: number;
  canVote: boolean;
  canFlag: boolean;
  onVote: (layerId: string, voteType: 'up' | 'down') => void;
  onBuild: () => void;
  onFlagLayer: (layerId: string) => void;
  userVotes: Record<string, 'up' | 'down' | null>;
  seedCreator?: {
    first_name: string;
    last_name: string;
  };
  cardCreatedAt: string;
}

export function ContributorsView({
  layers,
  featuredLayer,
  providerId,
  reputation,
  canVote,
  canFlag,
  onVote,
  onBuild,
  onFlagLayer,
  userVotes,
  seedCreator,
  cardCreatedAt,
}: ContributorsViewProps) {
  const [isOthersExpanded, setIsOthersExpanded] = useState(true);
  
  const otherLayers = layers.filter(l => !l.is_featured);
  const hasOtherLayers = otherLayers.length > 0;

  // Empty state
  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No contributions yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Be the first to add knowledge to this card.
        </p>
        <Button onClick={onBuild}>
          <Plus className="h-4 w-4 mr-2" />
          Add First Contribution
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Featured Layer */}
      {featuredLayer && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Featured Version</span>
          </div>
          <div className="relative">
            <Badge 
              className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground"
            >
              <Crown className="h-3 w-3 mr-1" />
              Featured
            </Badge>
            <PulseCardLayer
              layer={featuredLayer}
              reputation={reputation}
              userVote={userVotes[featuredLayer.id] || null}
              canVote={canVote}
              onVote={(voteType) => onVote(featuredLayer.id, voteType)}
            />
            {canFlag && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute bottom-3 right-3 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => onFlagLayer(featuredLayer.id)}
                title="Report this contribution"
              >
                <Flag className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Build Button */}
      <Button className="w-full" onClick={onBuild}>
        <Plus className="h-4 w-4 mr-2" />
        Build on this Card
      </Button>

      {/* Other Contributions */}
      {hasOtherLayers && (
        <div className="space-y-3">
          <button
            onClick={() => setIsOthersExpanded(!isOthersExpanded)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Other Contributions ({otherLayers.length})
            </span>
            {isOthersExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
            )}
          </button>

          <div className={cn(
            "space-y-3 transition-all duration-300",
            !isOthersExpanded && "hidden"
          )}>
            {otherLayers.map((layer) => (
              <div key={layer.id} className="relative">
                <PulseCardLayer
                  layer={layer}
                  reputation={reputation}
                  userVote={userVotes[layer.id] || null}
                  canVote={canVote}
                  onVote={(voteType) => onVote(layer.id, voteType)}
                />
                {canFlag && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute bottom-3 right-3 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onFlagLayer(layer.id)}
                    title="Report this contribution"
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seed Creator Info */}
      {seedCreator && (
        <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Card started by{' '}
              <span className="font-medium text-foreground">
                {seedCreator.first_name} {seedCreator.last_name}
              </span>
              {' '}{formatDistanceToNow(new Date(cardCreatedAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
