/**
 * CpaEnrollmentGate — Challenge-specific CPA acceptance at enrollment.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Loader2 } from 'lucide-react';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
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
        .select('id, document_type, document_name, content, status')
        .eq('challenge_id', challengeId)
        .eq('is_assembled', true)
        .in('status', ['APPROVED', 'DRAFT'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data as { id: string; document_type: string; document_name: string | null; content: string | null; status: string | null };
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

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!cpaDoc) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {cpaDoc.document_name ?? 'Challenge Participation Agreement'}
          <Badge variant="outline" className="ml-auto text-xs font-mono">{cpaDoc.document_type}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cpaDoc.content && (
          <div className="max-h-[250px] overflow-y-auto rounded border bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{cpaDoc.content}</pre>
          </div>
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
