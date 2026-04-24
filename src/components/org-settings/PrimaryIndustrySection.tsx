/**
 * PrimaryIndustrySection — Lets org admins choose which industry is the
 * organization's primary segment. Used for default-fill on Challenge creation.
 */

import { useState, useEffect } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { useOrgIndustries } from '@/hooks/queries/useOrgSettings';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PrimaryIndustrySectionProps {
  organizationId: string;
}

interface IndustryRow {
  id: string;
  industry_id: string;
  industry_segments?: { id: string; name: string } | null;
}

export function PrimaryIndustrySection({ organizationId }: PrimaryIndustrySectionProps) {
  const queryClient = useQueryClient();
  const { data: industriesRaw, isLoading } = useOrgIndustries(organizationId);
  const industries = (industriesRaw ?? []) as unknown as Array<IndustryRow & { is_primary?: boolean }>;

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Resolve current primary from the fetched rows (read via raw fetch since hook doesn't expose is_primary).
  // We do a lightweight secondary fetch to know which is primary.
  const [primaryRowId, setPrimaryRowId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!organizationId) return;
      const { data } = await supabase
        .from('seeker_org_industries')
        .select('id, is_primary')
        .eq('organization_id', organizationId);
      if (!cancelled && data) {
        const current = data.find((r) => r.is_primary)?.id ?? null;
        setPrimaryRowId(current);
        setSelectedRowId(current);
      }
    })();
    return () => { cancelled = true; };
  }, [organizationId, industriesRaw]);

  const setPrimaryMutation = useMutation({
    mutationFn: async (newPrimaryRowId: string) => {
      // Two-step swap: clear all, then set chosen one. The unique partial index
      // prevents two primaries; sequencing within a single-row update is fine
      // since the index only enforces uniqueness *among* TRUE rows.
      const { error: clearErr } = await supabase
        .from('seeker_org_industries')
        .update({ is_primary: false })
        .eq('organization_id', organizationId)
        .eq('is_primary', true);
      if (clearErr) throw new Error(clearErr.message);

      const { error: setErr } = await supabase
        .from('seeker_org_industries')
        .update({ is_primary: true })
        .eq('id', newPrimaryRowId);
      if (setErr) throw new Error(setErr.message);
    },
    onSuccess: () => {
      toast.success('Primary industry updated');
      queryClient.invalidateQueries({ queryKey: ['org_industries', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['org_model_context'] });
      queryClient.invalidateQueries({ queryKey: ['org_audit_trail', organizationId] });
    },
    onError: (e: Error) => handleMutationError(e, { operation: 'set_primary_industry' }),
  });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!industries.length) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No industries linked to this organization.
      </p>
    );
  }

  const isDirty = selectedRowId !== primaryRowId;

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          Primary Industry
        </Label>
        <p className="text-xs text-muted-foreground mt-1">
          Used as the default industry segment when creating a new challenge.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {industries.map((row) => {
          const isSelected = selectedRowId === row.id;
          const isCurrentPrimary = primaryRowId === row.id;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedRowId(row.id)}
              disabled={setPrimaryMutation.isPending}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-colors',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground hover:bg-muted',
                setPrimaryMutation.isPending && 'opacity-60 cursor-not-allowed',
              )}
            >
              {isCurrentPrimary && <Star className="h-3 w-3 fill-amber-500 text-amber-500" />}
              {row.industry_segments?.name ?? 'Unknown'}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!isDirty || !selectedRowId || setPrimaryMutation.isPending}
          onClick={() => selectedRowId && setPrimaryMutation.mutate(selectedRowId)}
        >
          {setPrimaryMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Save primary
        </Button>
      </div>
    </div>
  );
}
