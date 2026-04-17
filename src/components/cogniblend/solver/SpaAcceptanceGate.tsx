/**
 * SpaAcceptanceGate — SPA acceptance gate for Solution Provider users.
 * Writes directly to `legal_acceptance_log` (the same table `useSpaStatus` reads),
 * with nullable `challenge_id`, since SPA is a platform-level (non-challenge) agreement.
 */
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { getClientIP } from '@/lib/getClientIP';

interface SpaAcceptanceGateProps {
  userId: string;
  onAccepted: () => void;
}

export function SpaAcceptanceGate({ userId, onAccepted }: SpaAcceptanceGateProps) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: spaTemplate, isLoading } = useQuery({
    queryKey: ['spa-template'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_name, content, version, summary')
        .eq('document_code', 'SPA')
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE')
        .single();
      if (error) return null;
      return data as {
        template_id: string;
        document_name: string;
        content: string | null;
        version: string;
        summary: string | null;
      };
    },
    staleTime: 5 * 60_000,
  });

  const handleAccept = async () => {
    if (!spaTemplate) return;
    setSubmitting(true);
    try {
      const ipAddress = await getClientIP();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('legal_acceptance_log') as any).insert({
        user_id: userId,
        template_id: spaTemplate.template_id,
        document_code: 'SPA',
        document_version: spaTemplate.version,
        action: 'ACCEPT',
        trigger_event: 'USER_REGISTRATION',
        accepted_at: new Date().toISOString(),
        ip_address: ipAddress || null,
        user_agent: navigator.userAgent,
      });
      if (error) throw new Error(error.message);
      toast.success('Solution Provider Platform Agreement accepted');
      queryClient.invalidateQueries({ queryKey: ['spa-acceptance-status', userId] });
      onAccepted();
    } catch (e) {
      handleMutationError(e as Error, { operation: 'accept_spa' });
    } finally {
      setSubmitting(false);
    }
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
            I have read and agree to the Solution Provider Platform Agreement
          </label>
        </div>
        <Button onClick={handleAccept} disabled={!accepted || submitting} className="w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
          Accept & Continue
        </Button>
      </CardContent>
    </Card>
  );
}
