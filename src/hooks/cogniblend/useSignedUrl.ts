/**
 * useSignedUrl — Generates signed download URLs for storage files (R2 compliance).
 * Extracted from CreatorReferencesRenderer and SolverReferencePanel.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_EXPIRY_SECONDS = 3600;

export function useSignedUrl(bucket: string = 'challenge-attachments') {
  const openSignedUrl = useCallback(async (storagePath: string | null) => {
    if (!storagePath) return;
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  }, [bucket]);

  return { openSignedUrl };
}
