/**
 * RewardTypeChooser — Full guided wizard shown when no reward data exists.
 * Three large cards: Monetary / Non-Monetary / Both.
 */

import { DollarSign, Trophy, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RewardType } from '@/services/rewardStructureResolver';

interface RewardTypeChooserProps {
  onSelect: (type: RewardType) => void;
}

export default function RewardTypeChooser({ onSelect }: RewardTypeChooserProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[16px] font-semibold text-foreground mb-1">
          Set up Reward Structure
        </h3>
        <p className="text-[13px] text-muted-foreground">
          Choose the type of reward for this challenge
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monetary Card */}
        <button
          type="button"
          onClick={() => onSelect('monetary')}
          className={cn(
            'border-2 border-border rounded-2xl p-6 text-left',
            'hover:border-primary/50 hover:bg-primary/5',
            'cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        >
          <DollarSign className="h-7 w-7 text-primary mb-3" />
          <p className="text-[15px] font-semibold text-foreground">Monetary</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Cash prizes for winners
          </p>
        </button>

        {/* Non-Monetary Card */}
        <button
          type="button"
          onClick={() => onSelect('non_monetary')}
          className={cn(
            'border-2 border-border rounded-2xl p-6 text-left',
            'hover:border-accent hover:bg-accent/30',
            'cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        >
          <Trophy className="h-7 w-7 text-purple-500 mb-3" />
          <p className="text-[15px] font-semibold text-foreground">Non-Monetary</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Recognition, opportunities &amp; resources
          </p>
        </button>

        {/* Both Card */}
        <button
          type="button"
          onClick={() => onSelect('both')}
          className={cn(
            'border-2 border-border rounded-2xl p-6 text-left',
            'hover:border-primary/50 hover:bg-primary/5',
            'cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        >
          <Layers className="h-7 w-7 text-primary mb-3" />
          <p className="text-[15px] font-semibold text-foreground">Both</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Monetary + Non-monetary rewards combined
          </p>
        </button>
      </div>
    </div>
  );
}
