/**
 * React Query hook for MOD-02 Engine Audit Log (Supervisor only).
 * Fetches verification_assignment_log with scoring snapshots.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  verification_id: string;
  event_type: string;
  from_admin_id: string | null;
  to_admin_id: string | null;
  reason: string | null;
  initiator: string;
  scoring_snapshot: Record<string, unknown>;
  created_at: string;
  // Joined fields
  to_admin_name?: string;
}

export interface AuditLogFilters {
  dateFrom?: string;
  dateTo?: string;
  adminId?: string;
  outcome?: 'all' | 'assigned' | 'fallback';
}

export function useEngineAuditLog(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ['engine-audit-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('verification_assignment_log')
        .select(`
          id,
          verification_id,
          event_type,
          from_admin_id,
          to_admin_id,
          reason,
          initiator,
          scoring_snapshot,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59Z');
      }
      if (filters.adminId) {
        query = query.eq('to_admin_id', filters.adminId);
      }
      if (filters.outcome === 'assigned') {
        query = query.eq('event_type', 'AUTO_ASSIGNED');
      } else if (filters.outcome === 'fallback') {
        query = query.eq('event_type', 'FALLBACK_TO_QUEUE');
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as AuditLogEntry[];
    },
    staleTime: 60_000,
    gcTime: 300_000,
  });
}
