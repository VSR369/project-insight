/**
 * StrikeTracker - Displays moderation strikes for a provider
 * Shows transparent history of content violations
 */

import { AlertOctagon, Shield, Info, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MODERATION_ACTIONS } from '@/constants/pulseCards.constants';

interface Strike {
  id: string;
  action_type: keyof typeof MODERATION_ACTIONS;
  reasoning: string;
  outcome: 'upheld' | 'rejected';
  target_type: 'card' | 'layer';
  created_at: string;
}

interface StrikeTrackerProps {
  providerId: string | undefined;
  compact?: boolean;
}

function useProviderStrikes(providerId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-cards-provider-strikes', providerId],
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID required');

      // Get moderation actions where provider was the content creator
      // We need to join through cards/layers to find which were created by this provider
      const { data: cardActions, error: cardError } = await supabase
        .from('pulse_moderation_actions')
        .select(`
          id,
          action_type,
          reasoning,
          outcome,
          target_type,
          created_at,
          target_id
        `)
        .eq('target_type', 'card')
        .eq('outcome', 'upheld')
        .in('action_type', ['warning', 'mute_7d', 'archive', 'strike'])
        .order('created_at', { ascending: false });

      if (cardError) throw new Error(cardError.message);

      // Filter to only actions against this provider's content
      const providerStrikes: Strike[] = [];

      // Check cards
      for (const action of cardActions || []) {
        const { data: card } = await supabase
          .from('pulse_cards')
          .select('seed_creator_id')
          .eq('id', action.target_id)
          .single();

        if (card?.seed_creator_id === providerId) {
          providerStrikes.push(action as Strike);
        }
      }

      // Get layer actions too
      const { data: layerActions } = await supabase
        .from('pulse_moderation_actions')
        .select(`
          id,
          action_type,
          reasoning,
          outcome,
          target_type,
          created_at,
          target_id
        `)
        .eq('target_type', 'layer')
        .eq('outcome', 'upheld')
        .in('action_type', ['warning', 'mute_7d', 'archive', 'strike'])
        .order('created_at', { ascending: false });

      for (const action of layerActions || []) {
        const { data: layer } = await supabase
          .from('pulse_card_layers')
          .select('creator_id')
          .eq('id', action.target_id)
          .single();

        if (layer?.creator_id === providerId) {
          providerStrikes.push(action as Strike);
        }
      }

      // Sort by date and return
      return providerStrikes.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!providerId,
    staleTime: 5 * 60 * 1000,
  });
}

function getSeverityColor(actionType: string): string {
  const action = MODERATION_ACTIONS[actionType as keyof typeof MODERATION_ACTIONS];
  if (!action) return 'secondary';
  
  switch (action.severity) {
    case 4: return 'destructive';
    case 3: return 'destructive';
    case 2: return 'warning';
    case 1: return 'secondary';
    default: return 'outline';
  }
}

function StrikeBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
        <Shield className="mr-1 h-3 w-3" />
        Clean Record
      </Badge>
    );
  }

  const variant = count >= 3 ? 'destructive' : count >= 1 ? 'warning' : 'secondary';
  
  return (
    <Badge variant={variant as 'default' | 'destructive' | 'secondary'} className={count >= 3 ? '' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}>
      <AlertOctagon className="mr-1 h-3 w-3" />
      {count} Strike{count !== 1 ? 's' : ''}
    </Badge>
  );
}

export function StrikeTracker({ providerId, compact = false }: StrikeTrackerProps) {
  const { data: strikes, isLoading } = useProviderStrikes(providerId);

  const strikeCount = strikes?.filter(s => s.action_type === 'strike').length || 0;
  const totalActions = strikes?.length || 0;

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-6 w-24" />
    ) : (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Compact mode - just show badge
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <StrikeBadge count={strikeCount} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{strikeCount} strike{strikeCount !== 1 ? 's' : ''}, {totalActions} total moderation action{totalActions !== 1 ? 's' : ''}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Full card mode
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Moderation Record
          </CardTitle>
          <StrikeBadge count={strikeCount} />
        </div>
      </CardHeader>
      <CardContent>
        {totalActions === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <Shield className="h-8 w-8 text-green-500" />
            <div>
              <p className="font-medium text-green-600">Excellent Standing</p>
              <p className="text-sm text-muted-foreground">
                No moderation actions on record
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {totalActions} action{totalActions !== 1 ? 's' : ''} • {strikeCount} strike{strikeCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Strike warning */}
            {strikeCount >= 2 && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ {3 - strikeCount} more strike{3 - strikeCount !== 1 ? 's' : ''} until account review
                </p>
              </div>
            )}

            {/* Action history */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="history" className="border-none">
                <AccordionTrigger className="text-sm py-2 hover:no-underline">
                  View History
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2">
                    {strikes?.map(strike => (
                      <div
                        key={strike.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50"
                      >
                        <Badge variant={getSeverityColor(strike.action_type) as 'default' | 'destructive' | 'secondary'}>
                          {MODERATION_ACTIONS[strike.action_type]?.label || strike.action_type}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">{strike.reasoning}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(strike.created_at), 'MMM d, yyyy')} • 
                            {strike.target_type === 'card' ? 'Card' : 'Layer'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Appeal info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <ExternalLink className="h-3 w-3" />
              <span>Disagree with a decision? Contact support to appeal.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact strike indicator for profile headers
 */
export function StrikeIndicator({ providerId }: { providerId: string | undefined }) {
  return <StrikeTracker providerId={providerId} compact />;
}
