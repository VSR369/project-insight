/**
 * Modify Expertise Dialog
 * 
 * Dialog for modifying expertise level after interview failure (Path B).
 * Shows current configuration and allows changing expertise level.
 * Industry segment is read-only (never changeable).
 */

import { useState } from 'react';
import { AlertTriangle, RefreshCw, Lock, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useExpertiseLevels } from '@/hooks/queries/useExpertiseLevels';
import { useModifyExpertise } from '@/hooks/mutations/useModifyExpertise';
import { getExpertiseChangeReflowImpact } from '@/services/interviewRetakeService';

interface ModifyExpertiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  currentExpertiseLevelId?: string;
  currentExpertiseLevelName?: string;
  industrySegmentName?: string;
}

export function ModifyExpertiseDialog({
  open,
  onOpenChange,
  enrollmentId,
  currentExpertiseLevelId,
  currentExpertiseLevelName,
  industrySegmentName,
}: ModifyExpertiseDialogProps) {
  const [selectedExpertiseLevelId, setSelectedExpertiseLevelId] = useState<string | undefined>(
    currentExpertiseLevelId
  );
  const [confirmStep, setConfirmStep] = useState(false);

  const { data: expertiseLevels, isLoading: levelsLoading } = useExpertiseLevels();
  const modifyExpertise = useModifyExpertise();

  const impact = getExpertiseChangeReflowImpact();

  const handleProceed = () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    // Execute the modification
    modifyExpertise.mutate(
      {
        enrollmentId,
        expertiseLevelId: selectedExpertiseLevelId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setConfirmStep(false);
        },
      }
    );
  };

  const handleClose = () => {
    setConfirmStep(false);
    setSelectedExpertiseLevelId(currentExpertiseLevelId);
    onOpenChange(false);
  };

  const isExpertiseChanged = selectedExpertiseLevelId !== currentExpertiseLevelId;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Modify Expertise
          </DialogTitle>
          <DialogDescription>
            Change your expertise level to better match your experience. This will reset your proof points and assessment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Warning Alert */}
          <Alert variant="destructive" className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Important Notice</AlertTitle>
            <AlertDescription className="text-amber-700">
              {impact.message}
            </AlertDescription>
          </Alert>

          {/* Industry Segment (Read-Only) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Industry Segment</Label>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-muted-foreground">
              {industrySegmentName || 'Not selected'}
            </div>
            <p className="text-xs text-muted-foreground">
              Industry cannot be changed. Create a new enrollment for a different industry.
            </p>
          </div>

          {/* Expertise Level (Editable) */}
          <div className="space-y-2">
            <Label htmlFor="expertise-level">Expertise Level</Label>
            <Select
              value={selectedExpertiseLevelId}
              onValueChange={setSelectedExpertiseLevelId}
              disabled={levelsLoading || confirmStep}
            >
              <SelectTrigger id="expertise-level">
                <SelectValue placeholder="Select expertise level" />
              </SelectTrigger>
              <SelectContent>
                {expertiseLevels?.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name} ({level.min_years}-{level.max_years || '∞'} years)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isExpertiseChanged && (
              <p className="text-xs text-blue-600">
                Changing from: {currentExpertiseLevelName}
              </p>
            )}
          </div>

          {/* Confirmation Step */}
          {confirmStep && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Confirm Reset</AlertTitle>
              <AlertDescription className="text-red-700">
                <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                  <li>All your proof points will be deleted</li>
                  <li>Your assessment progress will be cleared</li>
                  <li>You will need to restart from Step 5 (Proof Points)</li>
                  <li>The cooling-off period still applies for re-interview</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Info Note */}
          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 border border-blue-200">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-xs text-blue-700">
              After modifying expertise, you'll need to complete proof points (Step 5) and
              assessment (Step 6) again before scheduling another interview.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={modifyExpertise.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            disabled={modifyExpertise.isPending}
            variant={confirmStep ? 'destructive' : 'default'}
          >
            {modifyExpertise.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : confirmStep ? (
              'Confirm & Reset'
            ) : (
              'Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
