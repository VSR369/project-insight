/**
 * Cascade Warning Dialog
 * 
 * Critical warning dialog shown when a field change will cause cascade deletions.
 * Uses destructive styling to emphasize the severity of the action.
 */

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
import { AlertTriangle, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { type CascadeImpact } from '@/services/lifecycleService';

interface CascadeImpactSummary {
  specialtyProofPointsCount: number;
  generalProofPointsCount: number;
  specialitiesCount: number;
  proficiencyAreasCount: number;
}

interface CascadeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cascadeType: 'industry_change' | 'expertise_change';
  impact: CascadeImpact;
  impactSummary: CascadeImpactSummary;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function CascadeWarningDialog({
  open,
  onOpenChange,
  cascadeType,
  impact,
  impactSummary,
  onConfirm,
  onCancel,
  isProcessing = false,
}: CascadeWarningDialogProps) {
  const isCritical = impact.warningLevel === 'critical';
  
  const title = cascadeType === 'industry_change'
    ? 'Change Industry Segment?'
    : 'Change Expertise Level?';

  const getImpactDescription = () => {
    const items: string[] = [];

    if (impact.deletesProofPoints === 'specialty_only' && impactSummary.specialtyProofPointsCount > 0) {
      items.push(`${impactSummary.specialtyProofPointsCount} specialty proof point${impactSummary.specialtyProofPointsCount !== 1 ? 's' : ''} will be deleted`);
    }

    if (impact.deletesSpecialities && impactSummary.specialitiesCount > 0) {
      items.push(`${impactSummary.specialitiesCount} speciality selection${impactSummary.specialitiesCount !== 1 ? 's' : ''} will be cleared`);
    }

    if (impact.deletesSpecialities && impactSummary.proficiencyAreasCount > 0) {
      items.push(`${impactSummary.proficiencyAreasCount} proficiency area${impactSummary.proficiencyAreasCount !== 1 ? 's' : ''} will be cleared`);
    }

    if (impact.resetsToStatus) {
      items.push(`Your progress will be reset to "${impact.resetsToStatus.replace(/_/g, ' ')}"`);
    }

    return items;
  };

  const impactItems = getImpactDescription();
  const hasImpact = impactItems.length > 0;

  // Don't show dialog if no impact
  if (!hasImpact && open) {
    onConfirm();
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={isCritical ? 'border-destructive' : ''}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${isCritical ? 'text-destructive' : 'text-amber-500'}`} />
            <span>{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className={isCritical ? 'text-destructive font-medium' : 'text-amber-600 dark:text-amber-400'}>
                {impact.message}
              </p>

              {hasImpact && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground text-sm">
                    This action will:
                  </p>
                  <ul className="space-y-1.5">
                    {impactItems.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        {item.includes('deleted') ? (
                          <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                        ) : (
                          <RotateCcw className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                {impactSummary.generalProofPointsCount > 0 && (
                  <>Your {impactSummary.generalProofPointsCount} general proof point{impactSummary.generalProofPointsCount !== 1 ? 's' : ''} will be preserved.</>
                )}
              </p>

              <p className="text-sm font-medium text-foreground">
                This action cannot be undone. Are you sure you want to proceed?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isProcessing}>
            Keep Current
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isProcessing}
            className={isCritical 
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' 
              : 'bg-amber-600 text-white hover:bg-amber-700'
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Change'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
