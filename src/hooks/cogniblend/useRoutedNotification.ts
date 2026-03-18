/**
 * useRoutedNotification — React hook wrapper around sendRoutedNotification.
 *
 * Provides a mutation that components can call to fire off routed notifications
 * after phase transitions, SLA events, etc.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  sendRoutedNotification,
  type RoutedNotificationParams,
} from '@/services/notificationRoutingService';
import { handleMutationError } from '@/lib/errorHandler';

export function useRoutedNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RoutedNotificationParams) => {
      const count = await sendRoutedNotification(params);
      return count;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cogni-notifications'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'send_routed_notification' });
    },
  });
}
