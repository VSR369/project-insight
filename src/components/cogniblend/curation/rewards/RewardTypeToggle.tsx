/**
 * RewardTypeToggle — Two-option toggle for switching between Monetary and Non-Monetary.
 * Shows confirmation dialog when switching with existing data.
 * Shows lock badge when isSubmitted.
 */

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RewardType } from '@/services/rewardStructureResolver';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RewardTypeToggleProps {
  currentType: RewardType;
  hasExistingData: boolean;
  disabled?: boolean;
  onSwitch: (type: RewardType) => void;
}

export default function RewardTypeToggle({
  currentType,
  hasExistingData,
  disabled = false,
  onSwitch,
}: RewardTypeToggleProps) {
  const [pendingType, setPendingType] = useState<RewardType>(null);

  const handleClick = (type: RewardType) => {
    if (disabled || type === currentType) return;
    if (hasExistingData) {
      setPendingType(type);
    } else {
      onSwitch(type);
    }
  };

  const confirmSwitch = () => {
    if (pendingType) {
      onSwitch(pendingType);
      setPendingType(null);
    }
  };

  const targetLabel = pendingType === 'monetary' ? 'Monetary' : 'Non-Monetary';
  const currentLabel = currentType === 'monetary' ? 'Monetary' : 'Non-Monetary';

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleClick('monetary')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
              currentType === 'monetary'
                ? 'border-2 border-primary bg-primary/5 text-foreground font-semibold'
                : 'border border-border bg-background text-muted-foreground hover:border-muted-foreground/50',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            💰 Monetary
          </button>
          <button
            type="button"
            onClick={() => handleClick('non_monetary')}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all',
              currentType === 'non_monetary'
                ? 'border-2 border-primary bg-primary/5 text-foreground font-semibold'
                : 'border border-border bg-background text-muted-foreground hover:border-muted-foreground/50',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            🏆 Non-Monetary
          </button>
        </div>

        {disabled && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span className="text-[10px] font-medium">Locked</span>
          </div>
        )}
      </div>

      {disabled && (
        <p className="text-[11px] text-muted-foreground mt-1">
          Reward structure is locked after submission.
        </p>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={!!pendingType} onOpenChange={(open) => !open && setPendingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change reward type?</AlertDialogTitle>
            <AlertDialogDescription>
              You currently have <span className="font-semibold text-foreground">{currentLabel}</span> reward data configured. Switching to <span className="font-semibold text-foreground">{targetLabel}</span> will permanently delete all {currentLabel} data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, switch to {targetLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
