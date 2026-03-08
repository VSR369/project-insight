import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMpaConfigValue } from '@/hooks/queries/useMpaConfig';

export function ExecutiveContactWarningBanner() {
  const { data: escalationContact, isLoading } = useMpaConfigValue('executive_escalation_contact_id');

  if (isLoading || escalationContact) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Executive Escalation Not Configured</AlertTitle>
      <AlertDescription>
        No executive escalation email is configured. If all admins become unavailable, 
        there will be no fallback contact. Configure this in Settings.
      </AlertDescription>
    </Alert>
  );
}
