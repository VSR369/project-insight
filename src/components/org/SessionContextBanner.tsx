/**
 * SessionContextBanner — Reusable banner showing current admin context.
 * Displays: [ShieldCheck] [Admin Name] | Organisation: [Org Name] | Primary
 */

import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOrgContext } from '@/contexts/OrgContext';
import { useCurrentSeekerAdmin } from '@/hooks/queries/useDelegatedAdmins';

export function SessionContextBanner() {
  const { organizationId, orgName } = useOrgContext();
  const { data: currentAdmin } = useCurrentSeekerAdmin(organizationId);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <ShieldCheck className="h-4 w-4" />
      <span>{currentAdmin?.full_name ?? 'Admin'}</span>
      <span className="text-muted-foreground/50">|</span>
      <span>Organisation: {orgName}</span>
      <span className="text-muted-foreground/50">|</span>
      <Badge variant="outline" className="text-xs">
        {currentAdmin?.admin_tier === 'PRIMARY' ? 'Primary' : 'Delegated'}
      </Badge>
    </div>
  );
}
