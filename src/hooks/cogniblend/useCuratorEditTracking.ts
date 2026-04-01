/**
 * useCuratorEditTracking — Tracks per-section curator editing behavior.
 *
 * Records: AI suggestion hash, curator action (accept/edit/rewrite),
 * edit distance %, time spent. Accumulates in memory, flushed on submit.
 */

import { useCallback, useRef } from 'react';
import { computeEditDistance, contentHash } from '@/lib/cogniblend/editDistance';

export type CuratorAction = 'accepted_unchanged' | 'accepted_with_edits' | 'rejected_rewritten' | 'skipped';

export interface SectionEditRecord {
  sectionKey: string;
  aiSuggestionHash: string | null;
  curatorAction: CuratorAction;
  editDistancePercent: number;
  timeSpentSeconds: number;
  confidenceScore: number | null;
}

const EDIT_THRESHOLD = 15; // % — below = minor edits, above = rewrite

export function useCuratorEditTracking() {
  const records = useRef<Map<string, SectionEditRecord>>(new Map());
  const aiHashes = useRef<Map<string, string>>(new Map());
  const focusTimers = useRef<Map<string, number>>(new Map());

  /**
   * Called when AI review completes for a section — stores the suggestion hash.
   */
  const registerAiSuggestion = useCallback((sectionKey: string, suggestionContent: string) => {
    aiHashes.current.set(sectionKey, contentHash(suggestionContent));
  }, []);

  /**
   * Called when curator focuses on a section editor.
   */
  const startTimer = useCallback((sectionKey: string) => {
    focusTimers.current.set(sectionKey, Date.now());
  }, []);

  /**
   * Called when curator saves a section after accepting AI suggestion.
   */
  const recordEdit = useCallback((
    sectionKey: string,
    aiContent: string | null,
    curatorContent: string,
    confidenceScore: number | null = null,
  ) => {
    const focusStart = focusTimers.current.get(sectionKey);
    const timeSpent = focusStart ? (Date.now() - focusStart) / 1000 : 0;
    focusTimers.current.delete(sectionKey);

    const aiHash = aiHashes.current.get(sectionKey) ?? null;

    if (!aiContent) {
      // No AI suggestion was present
      records.current.set(sectionKey, {
        sectionKey,
        aiSuggestionHash: null,
        curatorAction: 'skipped',
        editDistancePercent: 100,
        timeSpentSeconds: timeSpent,
        confidenceScore,
      });
      return;
    }

    const distance = computeEditDistance(aiContent, curatorContent);

    let action: CuratorAction;
    if (distance === 0) {
      action = 'accepted_unchanged';
    } else if (distance < EDIT_THRESHOLD) {
      action = 'accepted_with_edits';
    } else {
      action = 'rejected_rewritten';
    }

    records.current.set(sectionKey, {
      sectionKey,
      aiSuggestionHash: aiHash,
      curatorAction: action,
      editDistancePercent: distance,
      timeSpentSeconds: timeSpent,
      confidenceScore,
    });
  }, []);

  /**
   * Flush all accumulated records (called on submit).
   */
  const flush = useCallback((): SectionEditRecord[] => {
    const result = Array.from(records.current.values());
    records.current.clear();
    aiHashes.current.clear();
    focusTimers.current.clear();
    return result;
  }, []);

  /**
   * Get current records without flushing.
   */
  const getRecords = useCallback((): SectionEditRecord[] => {
    return Array.from(records.current.values());
  }, []);

  return {
    registerAiSuggestion,
    startTimer,
    recordEdit,
    flush,
    getRecords,
  };
}
