/**
 * EscrowManagementPage — Finance Coordinator escrow management.
 * Route: /cogni/escrow
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePwaStatus } from '@/hooks/cogniblend/usePwaStatus';
import { PwaAcceptanceGate } from '@/components/cogniblend/workforce/PwaAcceptanceGate';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormPersistence } from '@/hooks/useFormPersistence';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, CheckCircle2, Lock } from 'lucide-react';
import { EscrowDepositForm, escrowFormSchema, type EscrowFormValues } from './EscrowDepositForm';

interface EscrowChallenge {
  challenge_id: string;
  challenge_title: string;
  escrow_id: string | null;
  escrow_status: string | null;
  deposit_amount: number;
  reward_total: number;
  currency: string;
  bank_name: string | null;
  deposit_reference: string | null;
}

export default function EscrowManagementPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const { data: hasPwa, isLoading: pwaLoading } = usePwaStatus(user?.id);
  const [pwaAccepted, setPwaAccepted] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  const form = useForm<EscrowFormValues>({
    resolver: zodResolver(escrowFormSchema),
    defaultValues: {
      bank_name: '', bank_branch: '', bank_address: '', currency: 'USD',
      deposit_amount: 0, deposit_date: new Date().toISOString().split('T')[0],
      deposit_reference: '', fc_notes: '',
    },
  });
  const { clearPersistedData: clearEscrowPersistence } = useFormPersistence('cogni_escrow', form);

  const { data: escrowChallenges, isLoading } = useQuery({
    queryKey: ['fc-escrow-challenges', user?.id],
    queryFn: async (): Promise<EscrowChallenge[]> => {
      if (!user?.id) return [];
      const { data: roleData } = await supabase
        .from('user_challenge_roles' as any).select('challenge_id')
        .eq('user_id', user.id).eq('role_code', 'FC').eq('is_active', true);
      const challengeIds = ((roleData ?? []) as unknown as Array<{ challenge_id: string }>).map(r => r.challenge_id);
      if (challengeIds.length === 0) return [];

      const results: EscrowChallenge[] = [];
      for (const cid of challengeIds) {
        const [challengeRes, escrowRes] = await Promise.all([
          supabase.from('challenges').select('id, title, reward_structure').eq('id', cid).single(),
          supabase.from('escrow_records').select('id, escrow_status, deposit_amount, bank_name, deposit_reference, currency').eq('challenge_id', cid).maybeSingle(),
        ]);
        if (!challengeRes.data) continue;
        const rs = challengeRes.data.reward_structure as Record<string, unknown> | null;
        let rewardTotal = 0;
        if (rs) {
          const p = Number(rs.platinum_award ?? rs.budget_max ?? 0);
          const g = Number(rs.gold_award ?? 0);
          const s = Number(rs.silver_award ?? 0);
          rewardTotal = p + g + s;
          if (rewardTotal === 0) rewardTotal = Number(rs.budget_max ?? rs.budget_min ?? 0);
        }
        results.push({
          challenge_id: cid, challenge_title: challengeRes.data.title,
          escrow_id: escrowRes.data?.id ?? null, escrow_status: escrowRes.data?.escrow_status ?? null,
          deposit_amount: escrowRes.data?.deposit_amount ?? 0, reward_total: rewardTotal,
          currency: (escrowRes.data as any)?.currency ?? 'USD',
          bank_name: (escrowRes.data as any)?.bank_name ?? null,
          deposit_reference: (escrowRes.data as any)?.deposit_reference ?? null,
        });
      }
      return results;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const confirmEscrow = useMutation({
    mutationFn: async (values: EscrowFormValues & { challengeId: string; escrowId: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (values.escrowId) {
        const { error } = await supabase.from('escrow_records').update({
          escrow_status: 'FUNDED', deposit_amount: values.deposit_amount, remaining_amount: values.deposit_amount,
          bank_name: values.bank_name, bank_branch: values.bank_branch ?? null, bank_address: values.bank_address ?? null,
          currency: values.currency, deposit_date: new Date(values.deposit_date).toISOString(),
          deposit_reference: values.deposit_reference, fc_notes: values.fc_notes ?? null,
          updated_at: new Date().toISOString(), updated_by: user.id,
        } as any).eq('id', values.escrowId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('escrow_records').insert({
          challenge_id: values.challengeId, escrow_status: 'FUNDED', deposit_amount: values.deposit_amount,
          remaining_amount: values.deposit_amount, bank_name: values.bank_name, bank_branch: values.bank_branch ?? null,
          bank_address: values.bank_address ?? null, currency: values.currency,
          deposit_date: new Date(values.deposit_date).toISOString(), deposit_reference: values.deposit_reference,
          fc_notes: values.fc_notes ?? null, created_by: user.id,
        } as any);
        if (error) throw new Error(error.message);
      }
      await supabase.from('audit_trail').insert({
        user_id: user.id, challenge_id: values.challengeId, action: 'ESCROW_FUNDED', method: 'FC_MANUAL',
        details: { amount: values.deposit_amount, currency: values.currency, bank_name: values.bank_name, deposit_reference: values.deposit_reference },
      } as any);
    },
    onSuccess: async (_data, variables) => {
      toast.success('Escrow deposit confirmed successfully');
      // Call complete_financial_review RPC to set fc_compliance_complete and potentially advance phase
      try {
        const { error: rpcError } = await (supabase.rpc as Function)('complete_financial_review', {
          p_challenge_id: variables.challengeId,
          p_user_id: user?.id,
        });
        if (rpcError) {
          toast.warning('Escrow saved but financial review completion failed — please contact support.');
        } else {
          toast.success('Financial compliance confirmed — phase may auto-advance.');
        }
      } catch {
        toast.warning('Escrow saved but could not trigger phase advancement.');
      }
      setSelectedChallengeId(null); form.reset(); clearEscrowPersistence();
      queryClient.invalidateQueries({ queryKey: ['fc-escrow-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['escrow-deposit'] });
      queryClient.invalidateQueries({ queryKey: ['publication-readiness'] });
    },
    onError: (error: Error) => { handleMutationError(error, { operation: 'confirm_escrow' }); },
  });

  const handleSubmit = (values: EscrowFormValues) => {
    const challenge = escrowChallenges?.find(c => c.challenge_id === selectedChallengeId);
    if (!challenge || !selectedChallengeId) return;
    confirmEscrow.mutate({ ...values, challengeId: selectedChallengeId, escrowId: challenge.escrow_id });
  };

  if (isLoading || pwaLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" /><Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!hasPwa && !pwaAccepted) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <PwaAcceptanceGate userId={user?.id ?? ''} onAccepted={() => setPwaAccepted(true)} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" /> Escrow Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Confirm escrow deposits for challenges assigned to you</p>
      </div>

      {(!escrowChallenges || escrowChallenges.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No challenges requiring escrow are assigned to you.</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {escrowChallenges?.map((ch) => {
          const isFunded = ch.escrow_status === 'FUNDED';
          const isSelected = selectedChallengeId === ch.challenge_id;
          return (
            <Card key={ch.challenge_id} className={isSelected ? 'ring-2 ring-primary' : ''}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold">{ch.challenge_title}</p>
                      <Badge variant={isFunded ? 'default' : 'secondary'}>{isFunded ? 'Funded' : ch.escrow_status ?? 'Pending'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reward Total: <span className="font-medium">${ch.reward_total.toLocaleString()}</span>
                      {isFunded && ch.bank_name && <span className="ml-3">Bank: {ch.bank_name} | Ref: {ch.deposit_reference}</span>}
                    </p>
                  </div>
                  {!isFunded && (
                    <Button variant={isSelected ? 'default' : 'outline'} size="sm" onClick={() => {
                      setSelectedChallengeId(isSelected ? null : ch.challenge_id);
                      if (!isSelected) form.setValue('deposit_amount', ch.reward_total);
                    }}>
                      {isSelected ? 'Cancel' : 'Enter Deposit'}
                    </Button>
                  )}
                  {isFunded && <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />}
                </div>
                {isSelected && !isFunded && (
                  <EscrowDepositForm form={form} onSubmit={handleSubmit} isPending={confirmEscrow.isPending} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
