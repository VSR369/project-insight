/**
 * LegalDocsSummaryCard — Curator read-only summary of LC-approved legal docs.
 * S7D-2: surfaces the same `PreviewLegalSection` the Creator/LC see, sourced
 * from `usePreviewData` so there is zero duplication of fetch logic.
 *
 * Renders nothing until the LC has marked compliance complete (`lc_compliance_complete = true`)
 * — before that, the Curator sees their normal Pass-3 review panel instead.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePreviewData } from '@/components/cogniblend/preview/usePreviewData';
import { PreviewLegalSection } from '@/components/cogniblend/preview/PreviewLegalSection';
import { resolveGovernanceMode, isControlledMode } from '@/lib/governanceMode';

export interface LegalDocsSummaryCardProps {
  challengeId: string;
}

export function LegalDocsSummaryCard({ challengeId }: LegalDocsSummaryCardProps) {
  const { challenge, legalDetails, isLoading } = usePreviewData(challengeId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!challenge) return null;

  const lcComplete = !!(challenge as { lc_compliance_complete?: boolean }).lc_compliance_complete;
  if (!lcComplete) return null;

  const govMode = resolveGovernanceMode(
    (challenge as { governance_mode_override?: string | null; governance_profile?: string | null })
      .governance_mode_override
      ?? (challenge as { governance_profile?: string | null }).governance_profile,
  );
  const isControlled = isControlledMode(govMode);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          Legal Documents
          <Badge variant="outline" className="text-[10px] ml-1">LC-approved</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <PreviewLegalSection
          legalDetails={legalDetails}
          lcComplete={lcComplete}
          isControlled={isControlled}
        />
      </CardContent>
    </Card>
  );
}

export default LegalDocsSummaryCard;
