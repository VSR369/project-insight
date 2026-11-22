import { CalendarClock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface PublishSuccessScreenProps {
  challengeId: string;
  challengeTitle: string;
  scheduled?: boolean;
  scheduledStart?: string | null;
}

export function PublishSuccessScreen({
  challengeId,
  challengeTitle,
  scheduled = false,
  scheduledStart,
}: PublishSuccessScreenProps) {
  const navigate = useNavigate();
  const formattedStart = scheduledStart
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(scheduledStart))
    : null;
  const Icon = scheduled ? CalendarClock : CheckCircle2;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center px-4">
      <Icon className="h-16 w-16 text-primary" />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {scheduled ? 'Challenge Scheduled Successfully!' : 'Challenge Published Successfully!'}
        </h1>
        <p className="text-base text-foreground font-medium">{challengeTitle}</p>
        <p className="text-sm text-muted-foreground">
          {scheduled
            ? `It will open to Solution Providers at ${formattedStart} UTC.`
            : 'Now waiting for Solution Provider submissions.'}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
        <Button onClick={() => navigate(`/cogni/challenges/${challengeId}/view`)}>
          {scheduled ? 'View Scheduled Challenge' : 'View Published Challenge'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/cogni/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
