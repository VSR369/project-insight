import { User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateDetail } from "@/hooks/queries/useCandidateDetail";

interface ProviderDetailsSectionProps {
  candidate: CandidateDetail;
}

interface DetailFieldProps {
  label: string;
  value: string | null | undefined;
  isLink?: boolean;
}

function DetailField({ label, value, isLink }: DetailFieldProps) {
  const displayValue = value?.trim() || "Not Provided";
  const isEmpty = !value?.trim();

  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className={`text-sm ${isEmpty ? 'text-muted-foreground italic' : ''}`}>
        {isLink && !isEmpty ? (
          <span className="flex items-center gap-1">
            🌐 {displayValue}
          </span>
        ) : (
          displayValue
        )}
      </dd>
    </div>
  );
}

export function ProviderDetailsSection({ candidate }: ProviderDetailsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" />
          Solution Provider Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
          <DetailField 
            label="First Name" 
            value={candidate.firstName} 
          />
          <DetailField 
            label="Last Name" 
            value={candidate.lastName} 
          />
          <div className="md:col-span-2">
            <DetailField 
              label="Address" 
              value={candidate.address} 
            />
          </div>
          <DetailField 
            label="Pin Code" 
            value={candidate.pinCode} 
          />
          <DetailField 
            label="Country" 
            value={candidate.countryName}
            isLink
          />
          <div className="md:col-span-2">
            <DetailField 
              label="Industry Segment" 
              value={candidate.industrySegmentName} 
            />
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
