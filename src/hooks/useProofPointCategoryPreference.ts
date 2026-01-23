import { useState, useCallback } from 'react';

const STORAGE_KEY = 'proofPoint.lastCategory';

type Category = 'general' | 'specialty_specific';

/**
 * Hook to persist the last selected proof point category within a session.
 * This ensures when adding multiple proof points, the category selection
 * is remembered instead of resetting to 'general' each time.
 */
export function useProofPointCategoryPreference() {
  // Initialize from sessionStorage
  const getStoredCategory = (): Category => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'specialty_specific') return 'specialty_specific';
    return 'general'; // Default fallback
  };

  const [lastCategory] = useState<Category>(getStoredCategory);

  // Save to sessionStorage
  const saveCategory = useCallback((category: Category) => {
    sessionStorage.setItem(STORAGE_KEY, category);
  }, []);

  return { lastCategory, saveCategory };
}
