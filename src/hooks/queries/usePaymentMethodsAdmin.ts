import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy } from "@/lib/auditFields";
import { handleMutationError } from "@/lib/errorHandler";

export interface PaymentMethodAvailability {
  id: string;
  country_id: string;
  tier_id: string | null;
  payment_method: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  country?: { name: string; code: string };
  tier?: { name: string } | null;
}

export const PAYMENT_METHOD_OPTIONS = [
  { value: "credit_card", label: "Credit Card" },
  { value: "ach_bank_transfer", label: "ACH Bank Transfer" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "shadow", label: "Shadow (Internal)" },
];

export function usePaymentMethods(includeInactive = false) {
  return useQuery({
    queryKey: ["payment-methods-availability", { includeInactive }],
    queryFn: async () => {
      let query = supabase.from("md_payment_methods_availability")
        .select("id, country_id, tier_id, payment_method, is_active, created_at, updated_at, country:countries(name, code), tier:md_subscription_tiers(name)")
        .order("created_at", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data as unknown as PaymentMethodAvailability[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Record<string, unknown>) => {
      const d = await withCreatedBy(item);
      const { data, error } = await supabase.from("md_payment_methods_availability").insert(d as any).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods-availability"] }); toast.success("Payment method created successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "create_payment_method" }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const d = await withUpdatedBy(updates);
      const { data, error } = await supabase.from("md_payment_methods_availability").update(d as any).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods-availability"] }); toast.success("Payment method updated successfully"); },
    onError: (e: Error) => handleMutationError(e, { operation: "update_payment_method" }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_payment_methods_availability").update({ is_active: false }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods-availability"] }); toast.success("Payment method deactivated"); },
    onError: (e: Error) => handleMutationError(e, { operation: "deactivate_payment_method" }),
  });
}

export function useRestorePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_payment_methods_availability").update({ is_active: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods-availability"] }); toast.success("Payment method restored"); },
    onError: (e: Error) => handleMutationError(e, { operation: "restore_payment_method" }),
  });
}

export function useHardDeletePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("md_payment_methods_availability").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods-availability"] }); toast.success("Payment method permanently deleted"); },
    onError: (e: Error) => handleMutationError(e, { operation: "delete_payment_method" }),
  });
}
