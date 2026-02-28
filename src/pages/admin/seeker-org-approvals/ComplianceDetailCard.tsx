import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

interface ComplianceDetailCardProps {
  compliance: any;
}

function Field({ label, value }: { label: string; value?: string | null | boolean }) {
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || '—');
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{display}</p>
    </div>
  );
}

export function ComplianceDetailCard({ compliance }: ComplianceDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Compliance & Export Control
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Field label="ITAR Certified" value={compliance.itar_certified} />
        <Field label="ITAR Expiry" value={compliance.itar_certification_expiry} />
        <Field label="GDPR Compliant" value={compliance.gdpr_compliant} />
        <Field label="HIPAA Compliant" value={compliance.hipaa_compliant} />
        <Field label="SOC2 Compliant" value={compliance.soc2_compliant} />
        <Field label="ISO 27001 Certified" value={compliance.iso27001_certified} />
        {compliance.compliance_notes && (
          <div className="lg:col-span-3">
            <p className="text-xs text-muted-foreground">Notes</p>
            <p className="text-sm">{compliance.compliance_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
