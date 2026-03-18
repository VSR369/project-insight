/**
 * useDuplicateDetection — Debounced keyword search for similar challenges
 * in the same org. Triggers after 50+ chars with 500ms debounce.
 * BR-SR-005: Informational only, does not block submission.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';

// Stop words to filter out from keyword extraction
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'must', 'ought',
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it',
  'they', 'them', 'their', 'this', 'that', 'these', 'those', 'what',
  'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
  'but', 'or', 'nor', 'for', 'yet', 'of', 'in', 'on', 'at', 'to',
  'by', 'up', 'out', 'if', 'about', 'into', 'with', 'from', 'as',
  'want', 'like', 'also', 'well', 'back', 'there', 'then', 'here',
]);

const MIN_CHARS = 50;
const DEBOUNCE_MS = 500;

/**
 * Extract 3–4 significant words from input text for keyword search.
 */
export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  // Take unique words, prefer longer ones (more specific)
  const unique = [...new Set(words)].sort((a, b) => b.length - a.length);
  return unique.slice(0, 4);
}

export interface DuplicateMatch {
  id: string;
  title: string;
  masterStatus: string;
  problemStatement: string | null;
  keywordHits: number;
}

/**
 * Custom hook for debounced input value.
 */
function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timerRef.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timerRef.current);
  }, [value, delay]);

  return debounced;
}

/**
 * Main hook: watches business problem text, extracts keywords,
 * debounces, and queries for similar challenges in the same org.
 */
export function useDuplicateDetection(businessProblem: string) {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  const debouncedText = useDebouncedValue(businessProblem, DEBOUNCE_MS);

  const keywords = useMemo(() => {
    if ((debouncedText?.length ?? 0) < MIN_CHARS) return [];
    return extractKeywords(debouncedText);
  }, [debouncedText]);

  const searchEnabled = keywords.length >= 2 && !!orgId;

  const query = useQuery({
    queryKey: ['duplicate_detection', orgId, keywords],
    queryFn: async (): Promise<DuplicateMatch[]> => {
      if (!orgId || keywords.length === 0) return [];

      // Build OR filter: title or problem_statement ILIKE any keyword
      const orConditions = keywords
        .flatMap(kw => [
          `title.ilike.%${kw}%`,
          `problem_statement.ilike.%${kw}%`,
        ])
        .join(',');

      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, master_status, problem_statement')
        .eq('organization_id', orgId)
        .in('master_status', ['IN_PREPARATION', 'ACTIVE'])
        .or(orConditions)
        .limit(10);

      if (error) throw new Error(error.message);

      // Score each result by how many keywords match
      return (data ?? []).map(ch => {
        const combined = `${ch.title ?? ''} ${ch.problem_statement ?? ''}`.toLowerCase();
        const hits = keywords.filter(kw => combined.includes(kw)).length;
        return {
          id: ch.id,
          title: ch.title,
          masterStatus: ch.master_status ?? 'DRAFT',
          problemStatement: ch.problem_statement,
          keywordHits: hits,
        };
      })
        .filter(m => m.keywordHits >= 1)
        .sort((a, b) => b.keywordHits - a.keywordHits)
        .slice(0, 5);
    },
    enabled: searchEnabled,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });

  const hasHighSimilarity = (query.data ?? []).some(m => m.keywordHits >= 3);

  return {
    matches: query.data ?? [],
    isSearching: query.isFetching,
    hasHighSimilarity,
    keywords,
  };
}
