/**
 * SkpaAcceptanceDialog — Gate dialog shown when a Creator submits their first
 * challenge before having accepted the Seeker Knowledge Privacy Agreement.
 *
 * - Fetches the active SKPA template via legal_document_templates
 * - Renders inside ScrollToAcceptLegal (BR-LGL-007 scroll-to-accept)
 * - On accept: records via useRecordLegalAcceptance, then fires onAccepted()
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { ScrollToAcceptLegal } from '@/components/cogniblend/solver/ScrollToAcceptLegal';
import { useRecordLegalAcceptance } from '@/hooks/cogniblend/useLegalAcceptance';
import { handleQueryError } from '@/lib/errorHandler';
import { CACHE_STATIC } from '@/config/queryCache';
import { toast } from 'sonner';

interface SkpaTemplate {
  template_id: string;
  document_name: string;
  content: string | null;
  version: string;
  summary: string | null;
}

interface SkpaAcceptanceDialogProps {
  userId: string;
  open: boolean;
  onAccepted: () => void;
  onCancel: () => void;
}

export function SkpaAcceptanceDialog({
  userId,
  open,
  onAccepted,
  onCancel,
}: SkpaAcceptanceDialogProps) {
  const [accepted, setAccepted] = useState(false);
  const recordAcceptance = useRecordLegalAcceptance();

  const { data: skpaTemplate, isLoading, error } = useQuery<SkpaTemplate | null>({
    queryKey: ['skpa-template'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: qErr } = await (supabase.from('legal_document_templates') as any)
        .select('template_id, document_name, content, version, summary')
        .eq('document_code', 'SKPA')
        .eq('is_active', true)
        .eq('version_status', 'ACTIVE')
        .maybeSingle();
      if (qErr) {
        handleQueryError(qErr, { operation: 'fetch_skpa_template' });
        return null;
      }
      return (data ?? null) as SkpaTemplate | null;
    },
    enabled: open,
    ...CACHE_STATIC,
  });

  // Surface the missing-template case to the user so we never silently skip the gate
  useEffect(() => {
    if (open && !isLoading && !skpaTemplate && !error) {
      toast.error('Seeker Knowledge Privacy Agreement template is unavailable. Please contact support.');
    }
  }, [open, isLoading, skpaTemplate, error]);

  const documentContent = useMemo(() => skpaTemplate?.content ?? '', [skpaTemplate]);

  const handleAccept = () => {
    if (!skpaTemplate) return;
    recordAcceptance.mutate(
      {
        userId,
        challengeId: '',
        documentType: 'SKPA',
        documentName: skpaTemplate.document_name,
        documentVersion: skpaTemplate.version,
        scrollConfirmed: true,
      },
      {
        onSuccess: () => {
          toast.success('Seeker Knowledge Privacy Agreement accepted');
          setAccepted(false);
          onAccepted();
        },
      },
    );
  };

  const isBusy = recordAcceptance.isPending;

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v && !isBusy) onCancel(); }}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {skpaTemplate?.document_name ?? 'Seeker Knowledge Privacy Agreement'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {skpaTemplate?.summary ??
              'Before submitting your first challenge, please review and accept the Seeker Knowledge Privacy Agreement.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : skpaTemplate ? (
            <ScrollToAcceptLegal
              documentContent={documentContent}
              accepted={accepted}
              onAcceptedChange={setAccepted}
              acceptLabel="I have read and agree to the Seeker Knowledge Privacy Agreement."
              maxHeight={360}
            />
          ) : (
            <p className="text-sm text-destructive">
              The Seeker Knowledge Privacy Agreement template could not be loaded. Submission cannot proceed.
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAccept}
            disabled={!accepted || !skpaTemplate || isBusy}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Accept &amp; Continue Submission
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
