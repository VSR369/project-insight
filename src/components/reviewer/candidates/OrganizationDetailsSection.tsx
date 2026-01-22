import { Building2, Mail, Phone, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateDetail } from "@/hooks/queries/useCandidateDetail";

interface OrganizationDetailsSectionProps {
  candidate: CandidateDetail;
}

interface DetailFieldProps {
  label: string;
  value: string | null | undefined;
  type?: 'text' | 'email' | 'phone' | 'url';
}

function DetailField({ label, value, type = 'text' }: DetailFieldProps) {
  const displayValue = value?.trim() || "Not Provided";
  const isEmpty = !value?.trim();

  const renderValue = () => {
    if (isEmpty) {
      return <span className="text-muted-foreground italic">{displayValue}</span>;
    }

    switch (type) {
      case 'email':
        return (
          <a 
            href={`mailto:${value}`} 
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Mail className="h-4 w-4" />
            {value}
          </a>
        );
      case 'phone':
        return (
          <a 
            href={`tel:${value}`} 
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Phone className="h-4 w-4" />
            {value}
          </a>
        );
      case 'url':
        return (
          <a 
            href={value!.startsWith('http') ? value! : `https://${value}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Globe className="h-4 w-4" />
            {value}
          </a>
        );
      default:
        return displayValue;
    }
  };

  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">
        {renderValue()}
      </dd>
    </div>
  );
}

export function OrganizationDetailsSection({ candidate }: OrganizationDetailsSectionProps) {
  // Only render for ORG_REP mode
  const isOrgRep = candidate.participationModeCode?.toUpperCase() === "ORG_REP";
  
  if (!isOrgRep) {
    return null;
  }

  const org = candidate.organization;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="h-5 w-5 text-primary" />
          Organization Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <DetailField 
            label="Organization Name" 
            value={org?.org_name} 
          />
          <DetailField 
            label="Organization Type" 
            value={org?.org_type} 
          />
          <DetailField 
            label="Designation" 
            value={org?.designation} 
          />
          <DetailField 
            label="Website" 
            value={org?.org_website}
            type="url"
          />
          <DetailField 
            label="Manager Name" 
            value={org?.manager_name} 
          />
          <DetailField 
            label="Manager Email" 
            value={org?.manager_email}
            type="email"
          />
          <DetailField 
            label="Manager Phone" 
            value={org?.manager_phone}
            type="phone"
          />
        </dl>
      </CardContent>
    </Card>
  );
}
