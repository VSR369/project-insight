/**
 * lazyRetry — Wraps React.lazy() with automatic retry on transient import failures.
 *
 * When the Vite dev-server returns a 503 or the network hiccups, the dynamic
 * import fails with "Failed to fetch dynamically imported module". This wrapper
 * retries up to `maxRetries` times with exponential back-off before giving up.
 */

import { lazy, type ComponentType } from 'react';

interface LazyRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export function lazyRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyRetryOptions = {},
): React.LazyExoticComponent<T> {
  const { maxRetries = 3, baseDelayMs = 1000 } = options;

  return lazy(async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await importFn();
      } catch (err) {
        if (attempt === maxRetries) throw err;
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
      }
    }
    // Unreachable — satisfies TS
    throw new Error('lazyRetry exhausted');
  });
}
