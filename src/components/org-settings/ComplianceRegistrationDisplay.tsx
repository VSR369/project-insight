/**
 * ComplianceRegistrationDisplay (Phase 10b.2)
 *
 * Read-only surface for the registration-time compliance certifications
 * captured on `seeker_compliance` (ITAR, SOC2, ISO27001, GDPR, HIPAA, NDA,
 * data residency, export control). These are evidence of what the org
 * declared at onboarding — not editable here. To change them, the org
 * must re-submit a verification update through Compliance Officer review.
 */

import { ShieldCheck, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrgComplianceRegistration } from '@/hooks/queries/useOrgComplianceRegistration';

interface Props {
  organizationId: string;
}

function YesNoBadge({ value }: { value: boolean }) {
  return value ? (
    <Badge className="bg-primary/10 text-primary border-primary/20">Certified</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">Not certified</Badge>
  );
}

function AcceptedBadge({ value }: { value: boolean }) {
  return value ? (
    <Badge className="bg-primary/10 text-primary border-primary/20">Accepted</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
  );
}

export function ComplianceRegistrationDisplay({ organizationId }: Props) {
  const { data: reg, isLoading } = useOrgComplianceRegistration(organizationId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!reg) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Registration Compliance Profile
          </CardTitle>
          <CardDescription>No compliance registration on file.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rows: Array<{ label: string; node: React.ReactNode }> = [
    { label: 'ITAR', node: <YesNoBadge value={reg.itar_certified} /> },
    { label: 'SOC 2', node: <YesNoBadge value={reg.soc2_compliant} /> },
    { label: 'ISO 27001', node: <YesNoBadge value={reg.iso27001_certified} /> },
    { label: 'GDPR', node: <YesNoBadge value={reg.gdpr_compliant} /> },
    { label: 'HIPAA', node: <YesNoBadge value={reg.hipaa_compliant} /> },
    { label: 'DPA accepted', node: <AcceptedBadge value={reg.dpa_accepted} /> },
    { label: 'Privacy policy accepted', node: <AcceptedBadge value={reg.privacy_policy_accepted} /> },
    {
      label: 'Data residency',
      node: <span className="text-sm">{reg.data_residency?.name ?? '—'}</span>,
    },
    {
      label: 'Export control status',
      node: <span className="text-sm">{reg.export_control_status?.name ?? '—'}</span>,
    },
  ];

  if (reg.itar_certified && reg.itar_certification_expiry) {
    rows.splice(1, 0, {
      label: 'ITAR expiry',
      node: (
        <span className="text-sm">
          {new Date(reg.itar_certification_expiry).toLocaleDateString()}
        </span>
      ),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Registration Compliance Profile
          <Lock className="h-3 w-3 text-muted-foreground" />
        </CardTitle>
        <CardDescription>
          Certifications declared at onboarding. To update, contact your Compliance Officer
          to start a re-verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3">
              <dt className="text-sm text-muted-foreground">{r.label}</dt>
              <dd className="flex items-center">{r.node}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
