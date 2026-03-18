/**
 * useTaxonomySuggestions — Fetches auto-suggested taxonomy tags from
 * the suggest-taxonomy-tags edge function based on problem statement text.
 * Debounced at 800ms, only triggers when text > 100 chars.
 */

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TaxonomySuggestion {
  tag: string;
  source: string;
  relevance: number;
}

export function useTaxonomySuggestions(text: string | undefined) {
  const [suggestions, setSuggestions] = useState<TaxonomySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!text || text.length < 100) {
      setSuggestions([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('suggest-taxonomy-tags', {
          body: { text },
        });

        if (!error && data?.success && data.data?.suggestions) {
          setSuggestions(data.data.suggestions);
        }
      } catch {
        // Silently fail — suggestions are non-blocking
      } finally {
        setIsLoading(false);
      }
    }, 800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]);

  return { suggestions, isLoading };
}
