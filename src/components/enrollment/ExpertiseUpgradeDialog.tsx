/**
 * Expertise Upgrade Dialog
 * 
 * Confirmation dialog before initiating expertise upgrade.
 * Explains what happens and requires explicit confirmation.
 */

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { StarRating } from '@/components/ui/StarRating';
import { useUpgradeExpertise } from '@/hooks/mutations/useUpgradeExpertise';

interface ExpertiseUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  currentLevel: string | null;
  currentStars: number | null;
  industryName: string;
  onSuccess?: () => void;
}

export function ExpertiseUpgradeDialog({
  open,
  onOpenChange,
  enrollmentId,
  currentLevel,
  currentStars,
  industryName,
  onSuccess,
}: ExpertiseUpgradeDialogProps) {
  const [confirmed, setConfirmed] = useState(false);
  const upgradeExpertise = useUpgradeExpertise();

  const handleUpgrade = async () => {
    const result = await upgradeExpertise.mutateAsync(enrollmentId);
    if (result.success) {
      setConfirmed(false);
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmed(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Upgrade Expertise Level
          </DialogTitle>
          <DialogDescription>
            You are about to start the expertise upgrade process. Please review what will happen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current certification summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Expertise</span>
              <span className="font-medium">{currentLevel || 'Not set'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Star Rating</span>
              <StarRating rating={currentStars} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Industry</span>
              <div className="flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium text-sm">{industryName}</span>
              </div>
            </div>
          </div>

          {/* What happens section */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">What will happen:</h4>
            
            <div className="space-y-2">
              {/* Retained */}
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span>Your proof points will be <strong>retained</strong> (amending is optional)</span>
              </div>
              
              {/* Cleared */}
              <div className="flex items-start gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>Proficiency areas will be <strong>cleared</strong> (re-select required)</span>
              </div>
              
              {/* Required */}
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>You <strong>must re-take</strong> the knowledge assessment</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>You <strong>must complete</strong> a new panel interview</span>
              </div>

              {/* Locked */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>Industry segment cannot be changed</span>
              </div>
            </div>
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="confirm-upgrade"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
            />
            <label
              htmlFor="confirm-upgrade"
              className="text-sm leading-tight cursor-pointer"
            >
              I understand that I will need to complete a new assessment and interview to get re-certified.
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={upgradeExpertise.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={!confirmed || upgradeExpertise.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {upgradeExpertise.isPending ? 'Processing...' : 'Start Upgrade Process'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
