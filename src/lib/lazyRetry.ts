/**
 * lazyRetry — Wraps React.lazy() with automatic retry on transient import failures.
 *
 * When the Vite dev-server returns a 503 or the network hiccups, the dynamic
 * import fails with "Failed to fetch dynamically imported module". This wrapper
 * retries up to `maxRetries` times with exponential back-off before giving up.
 *
 * Some browsers cache failed dynamic imports for the life of the document. When
 * that happens, a remount retries the same dead module URL forever. To recover,
 * we force a one-time hard reload for chunk-fetch errors so the app boots with
 * a fresh module graph.
 */

import { lazy, type ComponentType } from 'react';

interface LazyRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  reloadOnChunkError?: boolean;
}

const DYNAMIC_IMPORT_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'failed to fetch module script',
];

const LAZY_RELOAD_KEY_PREFIX = 'lovable:lazy-retry';
const LAZY_RELOAD_QUERY_PARAM = '__lovable_lazy_reload';

export function isDynamicImportFetchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalizedMessage = message.toLowerCase();

  return DYNAMIC_IMPORT_ERROR_PATTERNS.some((pattern) =>
    normalizedMessage.includes(pattern),
  );
}

function getReloadStorageKey(): string | null {
  if (typeof window === 'undefined') return null;
  return `${LAZY_RELOAD_KEY_PREFIX}:${window.location.pathname}`;
}

function clearPendingReloadState(): void {
  if (typeof window === 'undefined') return;

  try {
    const storageKey = getReloadStorageKey();
    if (storageKey) {
      window.sessionStorage.removeItem(storageKey);
    }

    const url = new URL(window.location.href);
    if (!url.searchParams.has(LAZY_RELOAD_QUERY_PARAM)) return;

    url.searchParams.delete(LAZY_RELOAD_QUERY_PARAM);
    window.history.replaceState(window.history.state, document.title, url.toString());
  } catch {
    // Ignore recovery cleanup failures — they should never block route loading.
  }
}

function triggerHardReload(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const storageKey = getReloadStorageKey();
    if (!storageKey) return false;
    if (window.sessionStorage.getItem(storageKey) === '1') return false;

    window.sessionStorage.setItem(storageKey, '1');

    const url = new URL(window.location.href);
    url.searchParams.set(LAZY_RELOAD_QUERY_PARAM, Date.now().toString());
    window.location.replace(url.toString());
    return true;
  } catch {
    return false;
  }
}

export function hardReloadCurrentPageForDynamicImportFailure(error: unknown): boolean {
  if (!isDynamicImportFetchError(error)) return false;
  return triggerHardReload();
}

export function lazyRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyRetryOptions = {},
): React.LazyExoticComponent<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    reloadOnChunkError = true,
  } = options;

  return lazy(async () => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const importedModule = await importFn();
        clearPendingReloadState();
        return importedModule;
      } catch (err) {
        if (attempt === maxRetries) {
          if (reloadOnChunkError && hardReloadCurrentPageForDynamicImportFailure(err)) {
            return new Promise<{ default: T }>(() => {});
          }
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
      }
    }

    throw new Error('lazyRetry exhausted');
  });
}
