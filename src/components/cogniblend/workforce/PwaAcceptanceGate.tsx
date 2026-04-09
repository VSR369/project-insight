/**
 * PwaAcceptanceGate — PWA acceptance gate for MP workforce roles.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Loader2 } from 'lucide-react';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { toast } from 'sonner';

interface PwaAcceptanceGateProps {
  userId: string;
  challengeId?: string;
  onAccepted: () => void;
}

export function PwaAcceptanceGate({ userId, challengeId, onAccepted }: PwaAcceptanceGateProps) {
  const [accepted, setAccepted] = useState(false);
  const recordAcceptance = useRecordLegalAcceptance();

  const { data: pwaTemplate, isLoading } = useQuery({
    queryKey: ['pwa-template'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_name, content, version, summary')
        .eq('document_code', 'PWA')
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE')
        .single();
      if (error) return null;
      return data as { template_id: string; document_name: string; content: string | null; version: string; summary: string | null };
    },
    staleTime: 5 * 60_000,
  });

  const handleAccept = () => {
    if (!pwaTemplate) return;
    recordAcceptance.mutate(
      { userId, challengeId: challengeId ?? '', documentType: 'PWA', documentName: pwaTemplate.document_name, documentVersion: pwaTemplate.version, scrollConfirmed: true },
      { onSuccess: () => { toast.success('Prize & Work Agreement accepted'); onAccepted(); } },
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
        {pwaTemplate.content && (
          <div className="max-h-[300px] overflow-y-auto rounded border bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{pwaTemplate.content}</pre>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id="pwa-accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
          <label htmlFor="pwa-accept" className="text-sm cursor-pointer">
            I have read and agree to the Prize & Work Agreement
          </label>
        </div>
        <Button onClick={handleAccept} disabled={!accepted || recordAcceptance.isPending} className="w-full">
          {recordAcceptance.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Accept & Continue
        </Button>
      </CardContent>
    </Card>
  );
}
