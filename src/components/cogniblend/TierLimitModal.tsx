import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TierLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  tierName?: string;
  maxAllowed?: number;
  currentActive?: number;
}

export default function TierLimitModal({
  isOpen,
  onClose,
  tierName = 'Current',
  maxAllowed = 0,
  currentActive = 0,
}: TierLimitModalProps) {
  const navigate = useNavigate();

  const handleViewChallenges = () => {
    onClose();
    navigate('/challenges');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[480px] rounded-xl p-6">
        <DialogHeader className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(0,72%,95%)]">
            <AlertCircle className="h-6 w-6 text-[hsl(0,72%,50%)]" />
          </div>
          <DialogTitle className="text-lg font-bold text-[hsl(218,54%,25%)]">
            Challenge Limit Reached
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center mt-2 leading-relaxed">
          Your <span className="font-medium text-foreground">{tierName}</span> plan
          allows <span className="font-medium text-foreground">{maxAllowed}</span> active
          challenges. You currently
          have <span className="font-medium text-foreground">{currentActive}</span> active.
          Complete or cancel an existing challenge, or upgrade your plan.
        </p>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="text-[13px]">
            Close
          </Button>
          <Button onClick={handleViewChallenges} className="text-[13px]">
            View Active Challenges
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
