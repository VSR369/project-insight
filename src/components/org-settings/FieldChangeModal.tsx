/**
 * Field Change Modal (ORG-001)
 * 
 * Confirmation dialog shown when changing locked fields that trigger
 * cascading recalculations (country → currency/pricing, org-type → workflows).
 */

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface CascadeEffect {
  field: string;
  description: string;
}

interface FieldChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  cascadeEffects: CascadeEffect[];
  onConfirm: () => void;
  isPending?: boolean;
}

export function FieldChangeModal({
  open,
  onOpenChange,
  fieldLabel,
  oldValue,
  newValue,
  cascadeEffects,
  onConfirm,
  isPending = false,
}: FieldChangeModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-full max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm {fieldLabel} Change
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are changing <strong>{fieldLabel}</strong> from{' '}
                <span className="font-medium text-foreground">{oldValue}</span> to{' '}
                <span className="font-medium text-foreground">{newValue}</span>.
              </p>

              {cascadeEffects.length > 0 && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    This will trigger the following cascading changes:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    {cascadeEffects.map((effect, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-destructive mt-0.5">•</span>
                        <span>
                          <strong>{effect.field}:</strong> {effect.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Please review the changes carefully before proceeding.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Change
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Helper: get cascade effects for a country change
 */
export function getCountryChangeCascades(newCountryName: string): CascadeEffect[] {
  return [
    { field: 'Currency', description: `Will be recalculated based on ${newCountryName}'s default currency` },
    { field: 'Tier Pricing', description: 'Base fees will be recalculated for the new country' },
    { field: 'Phone Code', description: 'Primary contact phone code will be updated' },
    { field: 'Date/Number Format', description: 'Locale formatting will change' },
    { field: 'State/Province', description: 'State selection will be reset' },
  ];
}

/**
 * Helper: get cascade effects for an org type change
 */
export function getOrgTypeChangeCascades(newOrgTypeName: string): CascadeEffect[] {
  return [
    { field: 'Tier Recommendation', description: `Will be recalculated based on ${newOrgTypeName} rules` },
    { field: 'Subsidized Pricing', description: 'Discount eligibility will be re-evaluated' },
    { field: 'Verification Requirements', description: 'Document requirements may change' },
    { field: 'Compliance Flags', description: 'Compliance requirements will be updated' },
  ];
}
