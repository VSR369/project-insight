/**
 * useNotificationRouting — Query hooks for the notification_routing config table.
 *
 * Provides:
 *  - useNotificationRoutingConfig: fetch all active routing rules
 *  - useRoutingForPhase: fetch routing rules for a specific phase
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationRoutingRule {
  id: string;
  phase: number;
  event_type: string;
  primary_recipient_role: string;
  cc_roles: string[];
  escalation_roles: string[];
  is_active: boolean;
}

/**
 * Fetch all active notification routing rules
 */
export function useNotificationRoutingConfig() {
  return useQuery({
    queryKey: ['notification-routing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_routing')
        .select('id, phase, event_type, primary_recipient_role, cc_roles, escalation_roles, is_active')
        .eq('is_active', true)
        .order('phase')
        .order('event_type');
      if (error) throw new Error(error.message);
      return (data ?? []) as NotificationRoutingRule[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Fetch routing rules for a specific phase
 */
export function useRoutingForPhase(phase: number | undefined) {
  return useQuery({
    queryKey: ['notification-routing', 'phase', phase],
    queryFn: async () => {
      if (phase === undefined) return [];
      const { data, error } = await supabase
        .from('notification_routing')
        .select('id, phase, event_type, primary_recipient_role, cc_roles, escalation_roles, is_active')
        .eq('phase', phase)
        .eq('is_active', true)
        .order('event_type');
      if (error) throw new Error(error.message);
      return (data ?? []) as NotificationRoutingRule[];
    },
    enabled: phase !== undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
