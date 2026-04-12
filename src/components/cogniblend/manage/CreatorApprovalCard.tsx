/**
 * CreatorApprovalCard — Toggle for creator_approval_required in AGG model.
 * Visible only for Aggregator challenges in Phase 1 or Phase 2.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface CreatorApprovalCardProps {
  challengeId: string;
  operatingModel: string | null;
  currentPhase: number | null;
  extendedBrief: Json | null;
  userId: string;
}

export function CreatorApprovalCard({
  challengeId,
  operatingModel,
  currentPhase,
  extendedBrief,
  userId,
}: CreatorApprovalCardProps) {
  // Only show for AGG model in Phase 1 or 2
  if (operatingModel !== 'AGG' || !currentPhase || currentPhase > 2) return null;

  const parsedBrief = typeof extendedBrief === 'string'
    ? (() => { try { return JSON.parse(extendedBrief); } catch { return {}; } })()
    : (extendedBrief as Record<string, unknown>) ?? {};

  const initialValue = parsedBrief?.creator_approval_required === true;
  const [enabled, setEnabled] = useState(initialValue);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newValue: boolean) => {
      const merged = { ...parsedBrief, creator_approval_required: newValue };
      const { error } = await supabase
        .from('challenges')
        .update({ extended_brief: merged as Json, updated_by: userId })
        .eq('id', challengeId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, newValue) => {
      queryClient.invalidateQueries({ queryKey: ['manage-challenge', challengeId] });
      toast.success(newValue
        ? 'Creator approval enabled — you will be asked to approve before publication.'
        : 'Creator approval disabled — the Curator can publish after reviews are complete.');
    },
    onError: (error: Error) => {
      setEnabled(!enabled); // revert
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    mutation.mutate(checked);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <ClipboardCheck className="h-4.5 w-4.5 text-primary" />
          Creator Approval
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground">
            Require your approval before this challenge is published?
          </p>
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={mutation.isPending} />
        </div>
        <p className="text-xs text-muted-foreground">
          {enabled
            ? 'You will receive an approval request once all reviews are done. Publication requires your sign-off.'
            : 'The Curator can publish after legal and financial reviews are complete.'}
        </p>
      </CardContent>
    </Card>
  );
}
