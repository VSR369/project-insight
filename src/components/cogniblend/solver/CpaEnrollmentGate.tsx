/**
 * CpaEnrollmentGate — Challenge-specific CPA acceptance at enrollment.
 * Renders the assembled CPA with `{{variables}}` interpolated for display.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Loader2 } from 'lucide-react';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { useChallengeCpaDoc } from '@/hooks/queries/useChallengeCpaDoc';
import { useCpaGateContext } from '@/hooks/queries/useCpaGateContext';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { interpolateCpaTemplate } from '@/services/legal/cpaPreviewInterpolator';
import { toast } from 'sonner';

interface CpaEnrollmentGateProps {
  challengeId: string;
  userId: string;
  onAccepted: () => void;
}

export function CpaEnrollmentGate({ challengeId, userId, onAccepted }: CpaEnrollmentGateProps) {
  const [accepted, setAccepted] = useState(false);
  const recordAcceptance = useRecordLegalAcceptance();
  const { data: cpaDoc, isLoading } = useChallengeCpaDoc(challengeId);
  const { variables } = useCpaGateContext(challengeId);

  const interpolated = useMemo(() => {
    if (!cpaDoc || !variables) return { plain: null as string | null, html: null as string | null };
    const plain = cpaDoc.content ? interpolateCpaTemplate(cpaDoc.content, variables, 'strict') : null;
    const html = cpaDoc.content_html ? interpolateCpaTemplate(cpaDoc.content_html, variables, 'strict') : null;
    return { plain, html };
  }, [cpaDoc, variables]);

  const agreementLabel = useMemo(
    () => (cpaDoc?.document_type === 'SOURCE_DOC'
      ? 'Challenge-specific Participation Agreement'
      : (cpaDoc?.document_name ?? 'Challenge Participation Agreement')),
    [cpaDoc],
  );

  const handleAccept = () => {
    if (!cpaDoc) return;
    recordAcceptance.mutate(
      {
        userId,
        challengeId,
        documentType: cpaDoc.document_type,
        documentName: cpaDoc.document_name ?? 'CPA',
        documentVersion: '1.0',
        scrollConfirmed: true,
      },
      {
        onSuccess: () => {
          toast.success('Challenge Participation Agreement accepted');
          onAccepted();
        },
      },
    );
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!cpaDoc) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {agreementLabel}
          <Badge variant="outline" className="ml-auto text-xs font-mono">
            {cpaDoc.document_type === 'SOURCE_DOC' ? 'QUICK OVERRIDE' : cpaDoc.document_type}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cpaDoc.document_type === 'SOURCE_DOC' && interpolated.html ? (
          <div className="max-h-[250px] overflow-y-auto rounded border bg-muted/50 p-3">
            <LegalDocumentViewer content={interpolated.html} />
          </div>
        ) : interpolated.plain ? (
          <div className="max-h-[250px] overflow-y-auto rounded border bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{interpolated.plain}</pre>
          </div>
        ) : null}
        {cpaDoc.document_type === 'SOURCE_DOC' && (
          <p className="text-xs text-muted-foreground">
            This challenge is using a creator-provided QUICK replacement document for this challenge only.
          </p>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id="cpa-accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
          <label htmlFor="cpa-accept" className="text-sm cursor-pointer">
            I have read and agree to the Challenge Participation Agreement
          </label>
        </div>
        <Button size="sm" onClick={handleAccept} disabled={!accepted || recordAcceptance.isPending}>
          {recordAcceptance.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Accept &amp; Enroll
        </Button>
      </CardContent>
    </Card>
  );
}
