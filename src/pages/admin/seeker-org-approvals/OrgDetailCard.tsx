import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { ReviewField } from './ReviewField';
import type { SeekerOrg, SeekerOrgIndustry, SeekerOrgGeography } from './types';

interface OrgDetailCardProps {
  org: SeekerOrg;
  industries: SeekerOrgIndustry[];
  geographies: SeekerOrgGeography[];
}

/** Displays core organization identity details for admin review. */
export function OrgDetailCard({ org, industries, geographies }: OrgDetailCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Identity
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ReviewField label="Organization Name" value={org.organization_name} />
          <ReviewField label="Trade/Brand Name" value={org.trade_brand_name} />
          <ReviewField label="Legal Entity" value={org.legal_entity_name} />
          <ReviewField label="Type" value={org.organization_types?.name} />
          <ReviewField label="Registration Number" value={org.registration_number} />
          <ReviewField label="Tax ID" value={org.tax_id} />
          <ReviewField label="Website" value={org.website_url} />
          <ReviewField label="Founded" value={org.founding_year} />
          <ReviewField label="Employees" value={org.employee_count_range} />
          <ReviewField label="Revenue" value={org.annual_revenue_range} />
          <ReviewField label="Enterprise" value={org.is_enterprise} />
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">HQ Address</p>
          <p className="text-sm">
            {[org.hq_address_line1, org.hq_address_line2, org.hq_city, org.hq_postal_code, org.countries?.name].filter(Boolean).join(', ') || '—'}
          </p>
        </div>

        {org.organization_description && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{org.organization_description}</p>
          </div>
        )}

        {industries.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Industry Segments</p>
            <div className="flex flex-wrap gap-1">
              {industries.map((i) => (
                <Badge key={i.id} variant="secondary">{i.industry_segments?.name ?? i.industry_id}</Badge>
              ))}
            </div>
          </div>
        )}

        {geographies.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Operating Geographies</p>
            <div className="flex flex-wrap gap-1">
              {geographies.map((g) => (
                <Badge key={g.id} variant="outline">{g.countries?.name ?? g.country_id}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
