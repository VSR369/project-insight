/**
 * useLiveSectionCounts — reactive snapshot of the curation section store plus
 * per-section AI comment / suggestion counts for the right rail.
 */
import { useMemo, useSyncExternalStore } from "react";
import type { SectionKey, SectionStoreEntry } from "@/types/sections";

export interface CurationStoreLike {
  subscribe?: (cb: () => void) => () => void;
  getState?: () => { sections?: unknown } | undefined;
  sections?: unknown;
}

export interface LiveSectionCounts {
  liveSections: Partial<Record<SectionKey, SectionStoreEntry>>;
  commentCounts: Partial<Record<SectionKey, number>>;
  suggestionCounts: Partial<Record<SectionKey, number>>;
}

export function useLiveSectionCounts(curationStore: CurationStoreLike | null | undefined): LiveSectionCounts {
  // Reactive snapshot of section store. useSyncExternalStore re-renders this
  // component whenever the store changes (e.g. Re-analyse clears reviews,
  // a wave repopulates a section). Required so DiagnosticsSheet receives
  // live `sections` instead of a frozen one-time snapshot.
  const liveSections = useSyncExternalStore<Partial<Record<SectionKey, SectionStoreEntry>>>(
    (cb) => {
      if (!curationStore?.subscribe) return () => {};
      return curationStore.subscribe(cb);
    },
    () => {
      const store = curationStore;
      if (!store) return {};
      return (store.getState?.()?.sections ?? store.sections ?? {}) as Partial<Record<SectionKey, SectionStoreEntry>>;
    },
    () => ({}),
  );

  const commentCounts = useMemo(() => {
    const counts: Partial<Record<SectionKey, number>> = {};
    for (const [key, entry] of Object.entries(liveSections)) {
      const e = entry as SectionStoreEntry | undefined;
      if (e?.aiComments && Array.isArray(e.aiComments)) {
        counts[key as SectionKey] = e.aiComments.length;
      }
    }
    return counts;
  }, [liveSections]);

  const suggestionCounts = useMemo(() => {
    const counts: Partial<Record<SectionKey, number>> = {};
    for (const [key, entry] of Object.entries(liveSections)) {
      const e = entry as { aiSuggestion?: string | null } | undefined;
      if (e?.aiSuggestion) {
        counts[key as SectionKey] = 1;
      }
    }
    return counts;
  }, [liveSections]);

  return { liveSections, commentCounts, suggestionCounts };
}
