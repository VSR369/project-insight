/**
 * PwaAcceptanceGate — PWA acceptance gate for MP workforce roles.
 * When `challengeId` is provided, the template's `{{variables}}` are
 * interpolated with that challenge's context for display.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Loader2 } from 'lucide-react';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { usePwaTemplate } from '@/hooks/queries/usePwaTemplate';
import { usePwaGateContext } from '@/hooks/queries/usePwaGateContext';
import { interpolateCpaTemplate } from '@/services/legal/cpaPreviewInterpolator';
import { toast } from 'sonner';

interface PwaAcceptanceGateProps {
  userId: string;
  challengeId?: string;
  onAccepted: () => void;
}

export function PwaAcceptanceGate({ userId, challengeId, onAccepted }: PwaAcceptanceGateProps) {
  const [accepted, setAccepted] = useState(false);
  const recordAcceptance = useRecordLegalAcceptance();
  const { data: pwaTemplate, isLoading } = usePwaTemplate();
  const { variables } = usePwaGateContext(challengeId);

  const interpolatedContent = useMemo(() => {
    if (!pwaTemplate?.content) return null;
    return interpolateCpaTemplate(pwaTemplate.content, variables, 'strict');
  }, [pwaTemplate, variables]);

  const handleAccept = () => {
    if (!pwaTemplate) return;
    recordAcceptance.mutate(
      {
        userId,
        challengeId: challengeId ?? '',
        documentType: 'PWA',
        documentName: pwaTemplate.document_name,
        documentVersion: pwaTemplate.version,
        scrollConfirmed: true,
      },
      {
        onSuccess: () => {
          toast.success('Prize & Work Agreement accepted');
          onAccepted();
        },
      },
    );
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!pwaTemplate) return null;

  return (
    <Card className="border-primary/20 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          {pwaTemplate.document_name}
          <Badge variant="outline" className="ml-auto text-xs">v{pwaTemplate.version}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pwaTemplate.summary && (
          <p className="text-sm text-muted-foreground">{pwaTemplate.summary}</p>
        )}
        {interpolatedContent && (
          <div className="max-h-[300px] overflow-y-auto rounded border bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{interpolatedContent}</pre>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id="pwa-accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
          <label htmlFor="pwa-accept" className="text-sm cursor-pointer">
            I have read and agree to the Prize &amp; Work Agreement
          </label>
        </div>
        <Button onClick={handleAccept} disabled={!accepted || recordAcceptance.isPending} className="w-full">
          {recordAcceptance.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Accept &amp; Continue
        </Button>
      </CardContent>
    </Card>
  );
}
