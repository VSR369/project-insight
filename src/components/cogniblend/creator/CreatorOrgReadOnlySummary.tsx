/**
 * CreatorOrgReadOnlySummary — Read-only org profile summary sub-component.
 * Extracted from CreatorOrgContextCard.tsx for R1 compliance.
 */

import { Building2, MapPin, Users, Calendar, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface OrgSummaryProps {
  org: {
    organization_name: string;
    trade_brand_name?: string | null;
    hq_city?: string | null;
    employee_count_range?: string | null;
    annual_revenue_range?: string | null;
    founding_year?: number | null;
  };
  orgTypeName: string;
  countryName: string;
  allIndustryNames: string[];
  primaryIndustry?: string;
}

export function CreatorOrgReadOnlySummary({
  org, orgTypeName, countryName, allIndustryNames, primaryIndustry,
}: OrgSummaryProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-base font-bold text-foreground">
          {org.organization_name}
        </h3>
        {org.trade_brand_name && (
          <span className="text-sm text-muted-foreground">({org.trade_brand_name})</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Building2 className="h-3.5 w-3.5" />
          {orgTypeName}
        </span>
        {countryName && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {org.hq_city ? `${org.hq_city}, ` : ''}{countryName}
          </span>
        )}
        {org.employee_count_range && (
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {org.employee_count_range} employees
          </span>
        )}
        {org.annual_revenue_range && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            {org.annual_revenue_range}
          </span>
        )}
        {org.founding_year && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Founded {org.founding_year}
          </span>
        )}
      </div>

      {allIndustryNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {allIndustryNames.map((name) => (
            <Badge
              key={name}
              variant={name === primaryIndustry ? 'default' : 'secondary'}
              className="text-[10px]"
            >
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
