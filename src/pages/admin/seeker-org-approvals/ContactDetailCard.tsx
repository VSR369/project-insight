import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface ContactDetailCardProps {
  contact: any;
  allContacts: any[];
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  );
}

export function ContactDetailCard({ contact, allContacts }: ContactDetailCardProps) {
  if (!contact) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Contacts ({allContacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {allContacts.map((c: any) => (
          <div key={c.id} className="grid grid-cols-1 lg:grid-cols-3 gap-4 border-b pb-4 last:border-0 last:pb-0">
            <div className="lg:col-span-3 flex gap-2 items-center">
              <span className="text-sm font-semibold">{c.first_name} {c.last_name}</span>
              {c.is_primary && <Badge variant="default" className="text-xs">Primary</Badge>}
              <Badge variant="outline" className="text-xs">{c.contact_type}</Badge>
              {c.email_verified && <Badge variant="secondary" className="text-xs">Email Verified</Badge>}
            </div>
            <Field label="Email" value={c.email} />
            <Field label="Phone" value={c.phone_number ? `${c.phone_country_code ?? ''} ${c.phone_number}` : null} />
            <Field label="Job Title" value={c.job_title} />
            <Field label="Department" value={c.department} />
            <Field label="Timezone" value={c.timezone} />
            <Field label="Decision Maker" value={c.is_decision_maker ? 'Yes' : 'No'} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
