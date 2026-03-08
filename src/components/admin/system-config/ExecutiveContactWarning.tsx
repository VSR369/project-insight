/**
 * ExecutiveContactWarning — Red alert banner when executive_escalation_contact_id is NULL.
 * Shown on SCR-07-01 and AdminHeader.
 */

import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';

interface ExecutiveContactWarningProps {
  /** Compact mode for header bar */
  compact?: boolean;
}

function scrollToEscalation() {
  const el = document.getElementById('config-group-ESCALATION');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function ExecutiveContactWarning({ compact = false }: ExecutiveContactWarningProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (location.pathname === '/admin/system-config') {
      scrollToEscalation();
    } else {
      navigate('/admin/system-config');
      setTimeout(scrollToEscalation, 300);
    }
  };

  if (compact) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-1.5 flex items-center gap-2 text-sm">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-destructive font-medium">Executive escalation contact not configured.</span>
        <Button
          variant="link"
          size="sm"
          className="text-destructive h-auto p-0 font-semibold"
          onClick={handleClick}
        >
          Configure now →
        </Button>
      </div>
    );
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Executive Escalation Not Configured</AlertTitle>
      <AlertDescription className="flex items-center gap-2">
        <span>
          No executive escalation contact is set. If all admins become unavailable,
          there will be no fallback contact.
        </span>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={handleClick}
        >
          Configure now →
        </Button>
      </AlertDescription>
    </Alert>
  );
}
