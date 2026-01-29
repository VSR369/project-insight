/**
 * Loot Box Modal Component
 * Enhanced with countdown timer, celebration animation, and rewards display
 */

import { useState, useEffect } from 'react';
import { Gift, Clock, Sparkles, Coins, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTodayLootBox, useOpenLootBox, useProviderStats } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface LootBoxModalProps {
  providerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LootBoxRewards {
  xp: number;
  gold_tokens: number;
  visibility_boost_tokens?: number;
}

export function LootBoxModal({ providerId, open, onOpenChange }: LootBoxModalProps) {
  const { data: lootBox, isLoading } = useTodayLootBox(providerId);
  const { data: stats } = useProviderStats(providerId);
  const { mutate: openLootBox, isPending } = useOpenLootBox();
  
  const [showRewards, setShowRewards] = useState(false);
  const [rewards, setRewards] = useState<LootBoxRewards | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');

  // Calculate time until midnight reset
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilNext(`${hours}h ${minutes}m`);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if already opened today
  const isOpened = !!lootBox?.opened_at;
  const existingRewards = lootBox?.rewards as unknown as LootBoxRewards | null | undefined;

  const handleOpen = () => {
    if (!lootBox?.id || isOpened) return;
    
    setIsAnimating(true);
    
    openLootBox(lootBox.id, {
      onSuccess: ({ rewards: newRewards }) => {
        setTimeout(() => {
          setRewards(newRewards);
          setShowRewards(true);
          setIsAnimating(false);
        }, 1500); // Animation duration
      },
      onError: () => {
        setIsAnimating(false);
      },
    });
  };

  const streakMultiplier = stats?.streakMultiplier || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
            Daily Loot Box
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isOpened || showRewards ? (
            // Rewards display
            <div className="text-center space-y-4">
              {/* Celebration confetti animation */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  {[...Array(12)].map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "absolute text-2xl animate-bounce",
                        i % 2 === 0 ? "animation-delay-100" : "animation-delay-200"
                      )}
                      style={{
                        transform: `rotate(${i * 30}deg) translateY(-40px)`,
                        animationDuration: `${0.5 + (i % 3) * 0.2}s`,
                      }}
                      aria-hidden="true"
                    >
                      {['✨', '🎉', '⭐', '💫'][i % 4]}
                    </span>
                  ))}
                </div>
                
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <Gift className="h-12 w-12 text-white" aria-hidden="true" />
                </div>
              </div>

              <h3 className="font-bold text-lg">🎁 Rewards Claimed!</h3>

              {/* Rewards list */}
              <div className="space-y-2">
                {(rewards || existingRewards)?.xp && (rewards || existingRewards)!.xp > 0 && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" aria-hidden="true" />
                    <span className="font-bold text-lg">+{(rewards || existingRewards)!.xp} XP</span>
                  </div>
                )}
                
                {(rewards || existingRewards)?.gold_tokens && (rewards || existingRewards)!.gold_tokens > 0 && (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-yellow-500/10">
                    <Coins className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                    <span className="font-bold text-lg text-yellow-600">
                      +{(rewards || existingRewards)!.gold_tokens} Gold Token!
                    </span>
                  </div>
                )}
              </div>

              {/* Streak bonus info */}
              {streakMultiplier > 1 && (
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                  {streakMultiplier}x Streak Bonus Applied!
                </Badge>
              )}

              {/* Next loot box countdown */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Next loot box in {timeUntilNext}</span>
              </div>

              <Button onClick={() => onOpenChange(false)} className="w-full">
                Awesome!
              </Button>
            </div>
          ) : isLoading ? (
            // Loading state
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted animate-pulse" />
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          ) : !lootBox ? (
            // No loot box available yet
            <div className="text-center py-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Gift className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-muted-foreground mb-2">
                Create content or complete your standup to unlock today's loot box!
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Resets in {timeUntilNext}</span>
              </div>
            </div>
          ) : (
            // Ready to open
            <div className="text-center space-y-4">
              {/* Animated gift box */}
              <div 
                className={cn(
                  "relative w-28 h-28 mx-auto transition-transform duration-300",
                  isAnimating && "animate-bounce scale-110"
                )}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 animate-pulse shadow-lg shadow-primary/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Gift 
                    className={cn(
                      "h-14 w-14 text-white transition-transform",
                      isAnimating && "animate-spin"
                    )} 
                    aria-hidden="true" 
                  />
                </div>
                {/* Sparkle effects */}
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse" aria-hidden="true" />
                <Sparkles className="absolute -bottom-1 -left-1 h-5 w-5 text-yellow-400 animate-pulse animation-delay-200" aria-hidden="true" />
              </div>

              <div>
                <h3 className="font-bold text-lg">Daily Rewards Ready!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats?.current_streak && stats.current_streak > 0 
                    ? `🔥 ${stats.current_streak} day streak! ${streakMultiplier}x bonus applied`
                    : "Open to claim your rewards"}
                </p>
              </div>

              <Button 
                onClick={handleOpen} 
                disabled={isPending || isAnimating}
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
              >
                {isPending || isAnimating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">🎲</span>
                    Opening...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Gift className="h-5 w-5" aria-hidden="true" />
                    Open Loot Box
                  </span>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span>Expires in {timeUntilNext}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
