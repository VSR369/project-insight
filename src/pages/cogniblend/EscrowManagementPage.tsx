/**
 * EscrowManagementPage — Finance Coordinator escrow management.
 * Route: /cogni/escrow
 *
 * FC sees challenges assigned to them that require escrow,
 * enters banking/deposit details, and confirms funding.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormPersistence } from '@/hooks/useFormPersistence';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Banknote,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  Lock,
} from 'lucide-react';

/* ─── Schema ─────────────────────────────────────────────── */

const escrowFormSchema = z.object({
  bank_name: z.string().min(1, 'Bank name is required').max(200),
  bank_branch: z.string().max(200).optional(),
  bank_address: z.string().max(500).optional(),
  currency: z.string().min(1, 'Currency is required'),
  deposit_amount: z.coerce.number().positive('Amount must be positive'),
  deposit_date: z.string().min(1, 'Deposit date is required'),
  deposit_reference: z.string().min(1, 'Transaction reference is required').max(100),
  fc_notes: z.string().max(1000).optional(),
});

type EscrowFormValues = z.infer<typeof escrowFormSchema>;

/* ─── Types ──────────────────────────────────────────────── */

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

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'AUD', 'CAD', 'SGD', 'AED', 'INR', 'JPY'];

/* ─── Main Component ─────────────────────────────────────── */

export default function EscrowManagementPage() {
  // ── Hooks ──
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);

  const form = useForm<EscrowFormValues>({
    resolver: zodResolver(escrowFormSchema),
    defaultValues: {
      bank_name: '',
      bank_branch: '',
      bank_address: '',
      currency: 'USD',
      deposit_amount: 0,
      deposit_date: new Date().toISOString().split('T')[0],
      deposit_reference: '',
      fc_notes: '',
    },
  });
  const { clearPersistedData: clearEscrowPersistence } = useFormPersistence('cogni_escrow', form);

  // Fetch challenges assigned to this FC that need escrow
  const { data: escrowChallenges, isLoading } = useQuery({
    queryKey: ['fc-escrow-challenges', user?.id],
    queryFn: async (): Promise<EscrowChallenge[]> => {
      if (!user?.id) return [];

      // Get challenges where user has FC role
      const { data: roleData } = await supabase
        .from('user_challenge_roles' as any)
        .select('challenge_id')
        .eq('user_id', user.id)
        .eq('role_code', 'FC')
        .eq('is_active', true);

      const challengeIds = ((roleData ?? []) as unknown as Array<{ challenge_id: string }>).map(r => r.challenge_id);
      if (challengeIds.length === 0) return [];

      const results: EscrowChallenge[] = [];

      for (const cid of challengeIds) {
        const [challengeRes, escrowRes] = await Promise.all([
          supabase
            .from('challenges')
            .select('id, title, reward_structure')
            .eq('id', cid)
            .single(),
          supabase
            .from('escrow_records')
            .select('id, escrow_status, deposit_amount, bank_name, deposit_reference, currency')
            .eq('challenge_id', cid)
            .maybeSingle(),
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
          challenge_id: cid,
          challenge_title: challengeRes.data.title,
          escrow_id: escrowRes.data?.id ?? null,
          escrow_status: escrowRes.data?.escrow_status ?? null,
          deposit_amount: escrowRes.data?.deposit_amount ?? 0,
          reward_total: rewardTotal,
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

  // Confirm escrow mutation
  const confirmEscrow = useMutation({
    mutationFn: async (values: EscrowFormValues & { challengeId: string; escrowId: string | null }) => {
      if (!user?.id) throw new Error('Not authenticated');

      if (values.escrowId) {
        // Update existing escrow record
        const { error } = await supabase
          .from('escrow_records')
          .update({
            escrow_status: 'FUNDED',
            deposit_amount: values.deposit_amount,
            remaining_amount: values.deposit_amount,
            bank_name: values.bank_name,
            bank_branch: values.bank_branch ?? null,
            bank_address: values.bank_address ?? null,
            currency: values.currency,
            deposit_date: new Date(values.deposit_date).toISOString(),
            deposit_reference: values.deposit_reference,
            fc_notes: values.fc_notes ?? null,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          } as any)
          .eq('id', values.escrowId);

        if (error) throw new Error(error.message);
      } else {
        // Create new escrow record
        const { error } = await supabase
          .from('escrow_records')
          .insert({
            challenge_id: values.challengeId,
            escrow_status: 'FUNDED',
            deposit_amount: values.deposit_amount,
            remaining_amount: values.deposit_amount,
            bank_name: values.bank_name,
            bank_branch: values.bank_branch ?? null,
            bank_address: values.bank_address ?? null,
            currency: values.currency,
            deposit_date: new Date(values.deposit_date).toISOString(),
            deposit_reference: values.deposit_reference,
            fc_notes: values.fc_notes ?? null,
            created_by: user.id,
          } as any);

        if (error) throw new Error(error.message);
      }

      // Audit log
      await supabase.from('audit_trail').insert({
        user_id: user.id,
        challenge_id: values.challengeId,
        action: 'ESCROW_FUNDED',
        method: 'FC_MANUAL',
        details: {
          amount: values.deposit_amount,
          currency: values.currency,
          bank_name: values.bank_name,
          deposit_reference: values.deposit_reference,
        },
      } as any);
    },
    onSuccess: () => {
      toast.success('Escrow deposit confirmed successfully');
      setSelectedChallengeId(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['fc-escrow-challenges'] });
      queryClient.invalidateQueries({ queryKey: ['escrow-deposit'] });
      queryClient.invalidateQueries({ queryKey: ['publication-readiness'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'confirm_escrow' });
    },
  });

  // ── Handlers ──
  const handleSubmit = (values: EscrowFormValues) => {
    const challenge = escrowChallenges?.find(c => c.challenge_id === selectedChallengeId);
    if (!challenge || !selectedChallengeId) return;
    confirmEscrow.mutate({
      ...values,
      challengeId: selectedChallengeId,
      escrowId: challenge.escrow_id,
    });
  };

  // ── Conditional returns (AFTER all hooks) ──
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const selectedChallenge = escrowChallenges?.find(c => c.challenge_id === selectedChallengeId);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Escrow Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm escrow deposits for challenges assigned to you
        </p>
      </div>

      {/* Challenge List */}
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
                      <Badge variant={isFunded ? 'default' : 'secondary'}>
                        {isFunded ? 'Funded' : ch.escrow_status ?? 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reward Total: <span className="font-medium">${ch.reward_total.toLocaleString()}</span>
                      {isFunded && ch.bank_name && (
                        <span className="ml-3">Bank: {ch.bank_name} | Ref: {ch.deposit_reference}</span>
                      )}
                    </p>
                  </div>
                  {!isFunded && (
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setSelectedChallengeId(isSelected ? null : ch.challenge_id);
                        if (!isSelected) {
                          form.setValue('deposit_amount', ch.reward_total);
                        }
                      }}
                    >
                      {isSelected ? 'Cancel' : 'Enter Deposit'}
                    </Button>
                  )}
                  {isFunded && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  )}
                </div>

                {/* Deposit Form */}
                {isSelected && !isFunded && (
                  <div className="mt-4 pt-4 border-t">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <FormField control={form.control} name="bank_name" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. HSBC Holdings" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="bank_branch" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Branch</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. London Main" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="bank_address" render={({ field }) => (
                            <FormItem className="lg:col-span-2">
                              <FormLabel>Bank Address</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 8 Canada Square, London E14 5HQ" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="currency" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Currency *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {CURRENCIES.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="deposit_amount" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deposited Amount *</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} />
                              </FormControl>
                              <FormDescription>Must match the reward structure total</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="deposit_date" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deposit Date *</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="deposit_reference" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transaction Reference *</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. TXN-2026-03-001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />

                          <FormField control={form.control} name="fc_notes" render={({ field }) => (
                            <FormItem className="lg:col-span-2">
                              <FormLabel>FC Notes</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Any additional notes about the deposit…" rows={2} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" disabled={confirmEscrow.isPending}>
                            {confirmEscrow.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Building2 className="h-4 w-4 mr-2" />
                            )}
                            Confirm Escrow Deposit
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
