import { CalendarClock, Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface PublishConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  scheduled?: boolean;
  startAt?: string | null;
}

export function PublishConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  scheduled = false,
  startAt,
}: PublishConfirmModalProps) {
  const formattedStart = startAt
    ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(startAt))
    : null;
  const Icon = scheduled ? CalendarClock : Rocket;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {scheduled ? 'Schedule Challenge' : 'Publish Challenge'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-muted-foreground">
              <p>{scheduled ? `This challenge will open at ${formattedStart} UTC and will:` : 'Publishing this challenge will:'}</p>
              <ol className="list-decimal list-inside space-y-1.5 text-[13px]">
                <li>{scheduled ? 'Remain Scheduled and hidden until that time.' : 'Make it visible to Solution Providers based on your Visibility settings.'}</li>
                <li>Lock the operating model permanently.</li>
                <li>{scheduled ? 'Recheck compliance and escrow before opening automatically.' : 'Begin the Solution Provider submission period.'}</li>
              </ol>
              <p className="font-medium text-foreground text-[13px]">Are you sure?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Icon className="h-4 w-4 mr-1" />}
            {scheduled ? 'Schedule Challenge' : 'Publish Now'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
