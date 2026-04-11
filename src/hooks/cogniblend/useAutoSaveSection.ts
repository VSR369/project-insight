/**
 * useAutoSaveSection — Debounced autosave hook for curation sections.
 * Calls saveSectionMutation silently with debounce.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveSectionOptions {
  /** DB column name */
  field: string;
  /** Debounce in ms (default 600) */
  debounceMs?: number;
  /** If true, autosave is disabled */
  disabled?: boolean;
}

interface SaveMutation {
  mutate: (args: { field: string; value: unknown }) => void;
}

export function useAutoSaveSection(
  saveSectionMutation: SaveMutation,
  options: UseAutoSaveSectionOptions,
) {
  const { field, debounceMs = 600, disabled = false } = options;
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef<unknown>(undefined);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const save = useCallback(
    (value: unknown) => {
      if (disabled) return;
      latestValueRef.current = value;
      clearTimers();

      timerRef.current = setTimeout(() => {
        setStatus("saving");
        try {
          saveSectionMutation.mutate(
            { field, value },
          );
          // Optimistically set saved — mutation errors handled by orchestrator toast
          setStatus("saved");
          fadeTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
          fadeTimerRef.current = setTimeout(() => setStatus("idle"), 5000);
        }
      }, debounceMs);
    },
    [field, debounceMs, disabled, saveSectionMutation, clearTimers],
  );

  /** Flush pending save immediately (e.g. on unmount) */
  const flush = useCallback(() => {
    if (timerRef.current && latestValueRef.current !== undefined) {
      clearTimers();
      saveSectionMutation.mutate({ field, value: latestValueRef.current });
    }
  }, [field, saveSectionMutation, clearTimers]);

  return { save, flush, status } as const;
}
