import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { ReviewField } from './ReviewField';
import type { SeekerCompliance, SeekerOrg } from './types';

interface ComplianceDetailCardProps {
  compliance: SeekerCompliance;
  org: SeekerOrg;
}

/** Displays compliance and export control details for admin review. */
export function ComplianceDetailCard({ compliance, org }: ComplianceDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Compliance & Export Control
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReviewField label="Tax ID" value={org.tax_id} />
        <ReviewField label="NDA Preference" value={org.nda_preference} />
        <ReviewField label="NDA Review Status" value={org.nda_review_status} />
        <ReviewField label="Export Control Status" value={compliance.md_export_control_statuses?.name} />
        <ReviewField label="Data Residency" value={compliance.md_data_residency?.name} />
        <ReviewField label="ITAR Certified" value={compliance.itar_certified} />
        <ReviewField label="ITAR Expiry" value={compliance.itar_certification_expiry} />
        <ReviewField label="GDPR Compliant" value={compliance.gdpr_compliant} />
        <ReviewField label="HIPAA Compliant" value={compliance.hipaa_compliant} />
        <ReviewField label="SOC2 Compliant" value={compliance.soc2_compliant} />
        <ReviewField label="ISO 27001 Certified" value={compliance.iso27001_certified} />
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
