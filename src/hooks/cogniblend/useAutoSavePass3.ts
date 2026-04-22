/**
 * useAutoSavePass3 — Debounced autosave orchestrator over the existing
 * `saveEdits` mutation in useLcPass3Review. Pure orchestration; no DB access.
 */
import { useEffect, useRef, useState } from 'react';
import { stripDiffSpans } from '@/lib/cogniblend/legal/diffHighlight';

export type AutoSavePass3Status = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSavePass3Args {
  html: string;
  baselineHtml: string;
  enabled: boolean;
  saveFn: (html: string) => void;
  isSaving: boolean;
  saveError?: unknown;
  delayMs?: number;
}

export interface UseAutoSavePass3Result {
  status: AutoSavePass3Status;
  lastSavedAt: string | null;
}

export function useAutoSavePass3({
  html,
  baselineHtml,
  enabled,
  saveFn,
  isSaving,
  saveError,
  delayMs = 1500,
}: UseAutoSavePass3Args): UseAutoSavePass3Result {
  const [status, setStatus] = useState<AutoSavePass3Status>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasSavingRef = useRef<boolean>(false);
  const pendingRef = useRef<boolean>(false);

  // Schedule debounced save when the cleaned HTML diverges from baseline.
  useEffect(() => {
    if (!enabled) return;
    if (isSaving) return;
    const cleanCurrent = stripDiffSpans(html ?? '');
    const cleanBaseline = stripDiffSpans(baselineHtml ?? '');
    if (!cleanCurrent.trim()) return;
    if (cleanCurrent === cleanBaseline) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pendingRef.current = true;
      setStatus('saving');
      saveFn(cleanCurrent);
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [html, baselineHtml, enabled, isSaving, saveFn, delayMs]);

  // Detect saving falling edge → saved | error.
  useEffect(() => {
    if (wasSavingRef.current && !isSaving && pendingRef.current) {
      pendingRef.current = false;
      if (saveError) {
        setStatus('error');
      } else {
        setStatus('saved');
        setLastSavedAt(new Date().toISOString());
        if (fadeRef.current) clearTimeout(fadeRef.current);
        fadeRef.current = setTimeout(() => setStatus('idle'), 4000);
      }
    }
    wasSavingRef.current = isSaving;
  }, [isSaving, saveError]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    },
    [],
  );

  return { status, lastSavedAt };
}
