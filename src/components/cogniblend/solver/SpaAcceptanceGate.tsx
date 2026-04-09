/**
 * SpaAcceptanceGate — SPA acceptance gate for solver registration/login.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Loader2 } from 'lucide-react';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { toast } from 'sonner';

interface SpaAcceptanceGateProps {
  userId: string;
  onAccepted: () => void;
}

export function SpaAcceptanceGate({ userId, onAccepted }: SpaAcceptanceGateProps) {
  const [accepted, setAccepted] = useState(false);
  const recordAcceptance = useRecordLegalAcceptance();

  const { data: spaTemplate, isLoading } = useQuery({
    queryKey: ['spa-template'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_name, content, version, summary')
        .eq('document_code', 'SPA')
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE')
        .single();
      if (error) return null;
      return data as { template_id: string; document_name: string; content: string | null; version: string; summary: string | null };
    },
    staleTime: 5 * 60_000,
  });

  const handleAccept = () => {
    if (!spaTemplate) return;
    recordAcceptance.mutate(
      { userId, challengeId: '', documentType: 'SPA', documentName: spaTemplate.document_name, documentVersion: spaTemplate.version, scrollConfirmed: true },
      { onSuccess: () => { toast.success('Solver Platform Agreement accepted'); onAccepted(); } },
    );
  };

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!spaTemplate) return null;

  return (
    <Card className="border-primary/20 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {spaTemplate.document_name}
          <Badge variant="outline" className="ml-auto text-xs">v{spaTemplate.version}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {spaTemplate.summary && (
          <p className="text-sm text-muted-foreground">{spaTemplate.summary}</p>
        )}
        {spaTemplate.content && (
          <div className="max-h-[300px] overflow-y-auto rounded border bg-muted/50 p-3">
            <pre className="whitespace-pre-wrap text-sm">{spaTemplate.content}</pre>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id="spa-accept" checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} />
          <label htmlFor="spa-accept" className="text-sm cursor-pointer">
            I have read and agree to the Solver Platform Agreement
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
