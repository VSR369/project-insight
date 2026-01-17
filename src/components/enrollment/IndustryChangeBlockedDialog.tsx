/**
 * Industry Change Blocked Dialog
 * 
 * Displays when user attempts to change industry mid-enrollment.
 * Directs them to use Dashboard for industry management.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

interface IndustryChangeBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IndustryChangeBlockedDialog({ 
  open, 
  onOpenChange 
}: IndustryChangeBlockedDialogProps) {
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    onOpenChange(false);
    navigate('/dashboard');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Industry Cannot Be Changed Here</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              To enroll in another industry, go to Dashboard and click "Add Industry".
            </p>
            <p className="text-sm text-muted-foreground">
              Your current enrollment progress will be saved and you can return to it anytime.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleGoToDashboard} className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
