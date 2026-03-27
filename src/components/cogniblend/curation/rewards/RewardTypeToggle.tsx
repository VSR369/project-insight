/**
 * RewardTypeToggle — Radio group for Monetary / Non-Monetary / Both.
 * Shows lock badge when isLocked or isSubmitted.
 * Confirmation dialog when switching with existing data.
 */

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RewardType } from '@/services/rewardStructureResolver';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
  isLocked?: boolean;
  onSwitch: (type: RewardType) => void;
}

const OPTIONS: { value: string; label: string; emoji: string; desc: string }[] = [
  { value: 'monetary', label: 'Monetary', emoji: '💰', desc: 'Cash prizes for winners' },
  { value: 'non_monetary', label: 'Non-Monetary', emoji: '🏆', desc: 'Recognition & resources' },
  { value: 'both', label: 'Both', emoji: '🎯', desc: 'Monetary + Non-Monetary rewards' },
];

export default function RewardTypeToggle({
  currentType,
  hasExistingData,
  disabled = false,
  isLocked = false,
  onSwitch,
}: RewardTypeToggleProps) {
  const [pendingType, setPendingType] = useState<RewardType>(null);

  const isDisabled = disabled || isLocked;

  const handleChange = (value: string) => {
    if (isDisabled) return;
    const type = value as RewardType;
    if (type === currentType) return;
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

  const targetLabel = OPTIONS.find((o) => o.value === pendingType)?.label ?? '';
  const currentLabel = OPTIONS.find((o) => o.value === currentType)?.label ?? '';

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">Reward Type</span>
          {isLocked && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span className="text-[10px] font-medium">Locked</span>
            </div>
          )}
        </div>

        <RadioGroup
          value={currentType ?? ''}
          onValueChange={handleChange}
          disabled={isDisabled}
          className="flex flex-wrap gap-3"
        >
          {OPTIONS.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`reward-type-${opt.value}`}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-lg cursor-pointer transition-all border',
                currentType === opt.value
                  ? 'border-2 border-primary bg-primary/5 font-semibold'
                  : 'border-border bg-background hover:border-muted-foreground/50',
                isDisabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <RadioGroupItem value={opt.value} id={`reward-type-${opt.value}`} />
              <span className="text-lg">{opt.emoji}</span>
              <div>
                <p className="text-[13px] font-medium text-foreground">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>

        {isLocked && (
          <p className="text-[11px] text-muted-foreground">
            Reward type is locked. Only data for the selected type will be saved.
          </p>
        )}
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={!!pendingType} onOpenChange={(open) => !open && setPendingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change reward type?</AlertDialogTitle>
            <AlertDialogDescription>
              You currently have <span className="font-semibold text-foreground">{currentLabel}</span> data configured. Switching to <span className="font-semibold text-foreground">{targetLabel}</span> will change the active reward configuration. Your existing data will be preserved until you lock the reward type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch}>
              Yes, switch to {targetLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
