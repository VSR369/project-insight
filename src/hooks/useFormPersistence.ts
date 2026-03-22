/**
 * useFormPersistence — Auto-saves react-hook-form data to sessionStorage.
 * Restores on mount. Debounced watch subscriber ensures data persists
 * through navigation, tab-switches, and page refreshes.
 *
 * Usage:
 *   const { clearPersistedData } = useFormPersistence('my_form_key', form);
 *   // Call clearPersistedData() after successful submission
 */

import { useEffect, useRef, useCallback } from 'react';
import type { UseFormReturn, FieldValues } from 'react-hook-form';

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 500;

interface PersistedFormData {
  values: Record<string, unknown>;
  savedAt: number;
}

export function useFormPersistence<T extends FieldValues>(
  storageKey: string,
  form: UseFormReturn<T>,
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  // Restore on mount (once)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;

      const parsed: PersistedFormData = JSON.parse(raw);

      // Expiry check
      if (Date.now() - parsed.savedAt > EXPIRY_MS) {
        sessionStorage.removeItem(storageKey);
        return;
      }

      // Restore values — merge with defaults to avoid missing fields
      form.reset(parsed.values as T, { keepDefaultValues: false });
    } catch {
      // Graceful degradation
    }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to form changes and debounce-save
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        try {
          const data: PersistedFormData = {
            values: values as Record<string, unknown>,
            savedAt: Date.now(),
          };
          sessionStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
          // sessionStorage may be full
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [storageKey, form]);

  const clearPersistedData = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [storageKey]);

  return { clearPersistedData };
}

/**
 * Persist a simple state value (e.g. selectedTemplate) alongside form data.
 */
export function persistState(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

export function restoreState<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > EXPIRY_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.value as T;
  } catch {
    return null;
  }
}

export function clearState(key: string): void {
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}
