/**
 * useAutoSaveExtendedBrief — Debounced autosave for extended_brief JSONB subsections.
 * Merges subsection key into existing brief before writing.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AutoSaveStatus } from "./useAutoSaveSection";

interface SaveMutation {
  mutate: (args: { field: string; value: unknown }) => void;
}

interface UseAutoSaveExtendedBriefOptions {
  /** Subsection key within extended_brief (e.g. "root_causes") */
  subsectionKey: string;
  /** Current full extended_brief object from challenge */
  currentBrief: Record<string, unknown> | null;
  debounceMs?: number;
  disabled?: boolean;
}

export function useAutoSaveExtendedBrief(
  saveSectionMutation: SaveMutation,
  options: UseAutoSaveExtendedBriefOptions,
) {
  const { subsectionKey, currentBrief, debounceMs = 600, disabled = false } = options;
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
          const merged = { ...(currentBrief ?? {}), [subsectionKey]: value };
          saveSectionMutation.mutate({ field: "extended_brief", value: merged });
          setStatus("saved");
          fadeTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
          fadeTimerRef.current = setTimeout(() => setStatus("idle"), 5000);
        }
      }, debounceMs);
    },
    [subsectionKey, currentBrief, debounceMs, disabled, saveSectionMutation, clearTimers],
  );

  const flush = useCallback(() => {
    if (timerRef.current && latestValueRef.current !== undefined) {
      clearTimers();
      const merged = { ...(currentBrief ?? {}), [subsectionKey]: latestValueRef.current };
      saveSectionMutation.mutate({ field: "extended_brief", value: merged });
    }
  }, [subsectionKey, currentBrief, saveSectionMutation, clearTimers]);

  return { save, flush, status } as const;
}
