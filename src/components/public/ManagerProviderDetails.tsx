/**
 * ManagerProviderDetails — Provider info card for manager approval.
 */

import { User, Mail, Briefcase, Building2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ManagerProviderDetailsProps {
  sessionData: {
    providerName: string;
    providerEmail: string;
    providerDesignation?: string;
    orgName: string;
    requestDate: string;
  };
}

export function ManagerProviderDetails({ sessionData }: ManagerProviderDetailsProps) {
  const items = [
    { icon: User, label: 'Provider Name', value: sessionData.providerName },
    { icon: Mail, label: 'Provider Email', value: sessionData.providerEmail },
    ...(sessionData.providerDesignation ? [{ icon: Briefcase, label: 'Designation', value: sessionData.providerDesignation }] : []),
    { icon: Building2, label: 'Organization', value: sessionData.orgName },
    { icon: Calendar, label: 'Request Date', value: format(new Date(sessionData.requestDate), 'MMMM d, yyyy') },
  ];

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-start gap-3">
          <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
