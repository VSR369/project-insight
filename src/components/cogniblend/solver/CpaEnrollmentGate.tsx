/**
 * CpaEnrollmentGate — Challenge-specific CPA acceptance at enrollment.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Loader2 } from 'lucide-react';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { LegalDocumentViewer } from '@/components/legal/LegalDocumentViewer';
import { toast } from 'sonner';

interface CpaEnrollmentGateProps {
  challengeId: string;
  userId: string;
  onAccepted: () => void;
}

export function CpaEnrollmentGate({ challengeId, userId, onAccepted }: CpaEnrollmentGateProps) {
  const [accepted, setAccepted] = useState(false);
  const recordAcceptance = useRecordLegalAcceptance();

  const { data: cpaDoc, isLoading } = useQuery({
    queryKey: ['cpa-enrollment', challengeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenge_legal_docs')
        .select('id, document_type, document_name, content, content_html, status, override_strategy, target_template_code')
        .eq('challenge_id', challengeId)
        .or('and(document_type.eq.UNIFIED_SPA,is_assembled.eq.true,status.in.(APPROVED,DRAFT)),and(document_type.eq.SOURCE_DOC,source_origin.eq.creator,override_strategy.eq.REPLACE_DEFAULT,target_template_code.eq.CPA_QUICK,status.eq.uploaded)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data as {
        id: string;
        document_type: string;
        document_name: string | null;
        content: string | null;
        content_html: string | null;
        status: string | null;
        override_strategy: string | null;
        target_template_code: string | null;
      };
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });

  const handleAccept = () => {
    if (!cpaDoc) return;
    recordAcceptance.mutate(
      { userId, challengeId, documentType: cpaDoc.document_type, documentName: cpaDoc.document_name ?? 'CPA', documentVersion: '1.0', scrollConfirmed: true },
      { onSuccess: () => { toast.success('Challenge Participation Agreement accepted'); onAccepted(); } },
    );
  };

  const agreementLabel = useMemo(
    () => (cpaDoc?.document_type === 'SOURCE_DOC' ? 'Challenge-specific Participation Agreement' : (cpaDoc?.document_name ?? 'Challenge Participation Agreement')),
    [cpaDoc],
  );

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
        {cpaDoc.document_type === 'SOURCE_DOC' && cpaDoc.content_html ? (
          <div className="max-h-[250px] overflow-y-auto rounded border bg-muted/50 p-3">
            <LegalDocumentViewer content={cpaDoc.content_html} />
          </div>
        ) : cpaDoc.content ? (
          <div className="max-h-[250px] overflow-y-auto rounded border bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{cpaDoc.content}</pre>
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
          Accept & Enroll
        </Button>
      </CardContent>
    </Card>
  );
}
