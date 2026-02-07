/**
 * Visibility-Aware Polling Utilities
 * 
 * PERFORMANCE: These hooks pause polling when the browser tab is hidden,
 * preventing wasted API calls when the user isn't viewing the app.
 */

import { useEffect, useState } from 'react';

/**
 * Hook that tracks document visibility state
 * @returns true if the document is visible, false if hidden
 */
export function useDocumentVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Hook that returns a polling interval only when the document is visible
 * 
 * @param baseInterval - The polling interval in milliseconds, or false to disable
 * @returns The interval when visible, or false when hidden (pauses polling)
 * 
 * @example
 * ```tsx
 * const refetchInterval = useVisibilityPollingInterval(30000);
 * 
 * useQuery({
 *   queryKey: ['feed'],
 *   queryFn: fetchFeed,
 *   refetchInterval, // Pauses when tab is hidden
 * });
 * ```
 */
export function useVisibilityPollingInterval(
  baseInterval: number | false
): number | false {
  const isVisible = useDocumentVisibility();
  
  // Only poll when the document is visible
  return isVisible ? baseInterval : false;
}
