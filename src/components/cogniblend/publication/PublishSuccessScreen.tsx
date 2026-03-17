/**
 * PublishSuccessScreen — Full-page celebration after a challenge is published.
 */

import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PublishSuccessScreenProps {
  challengeId: string;
  challengeTitle: string;
}

export function PublishSuccessScreen({ challengeId, challengeTitle }: PublishSuccessScreenProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-emerald-700">
          Challenge Published Successfully!
        </h1>
        <p className="text-base text-foreground font-medium">
          {challengeTitle}
        </p>
        <p className="text-sm text-muted-foreground">
          Now waiting for solver submissions
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
        <Button
          onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}
        >
          View Published Challenge
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/cogni/dashboard')}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
