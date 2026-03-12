/**
 * Phase 8A: Session expired mid-assignment recovery (TS §15.2)
 * Preserves form data in sessionStorage on JWT expiry, restores after re-login.
 */

import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_RECOVERY_KEY = "rbac_session_recovery";

interface RecoveryData {
  route: string;
  formData: Record<string, unknown>;
  savedAt: string;
}

/** Save form data for recovery after session expiry */
export function useSaveFormForRecovery(formKey: string) {
  const save = useCallback(
    (formData: Record<string, unknown>) => {
      try {
        const recovery: RecoveryData = {
          route: window.location.pathname + window.location.search,
          formData,
          savedAt: new Date().toISOString(),
        };
        sessionStorage.setItem(`${SESSION_RECOVERY_KEY}_${formKey}`, JSON.stringify(recovery));
      } catch {
        // Graceful degradation — sessionStorage may be full or unavailable
      }
    },
    [formKey]
  );

  const clear = useCallback(() => {
    sessionStorage.removeItem(`${SESSION_RECOVERY_KEY}_${formKey}`);
  }, [formKey]);

  return { saveForRecovery: save, clearRecovery: clear };
}

/** Restore form data after re-login */
export function useRestoreFormFromRecovery(formKey: string): RecoveryData | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_RECOVERY_KEY}_${formKey}`);
    if (!raw) return null;

    const data: RecoveryData = JSON.parse(raw);

    // Expire recovery data after 30 minutes
    const savedAt = new Date(data.savedAt).getTime();
    if (Date.now() - savedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem(`${SESSION_RECOVERY_KEY}_${formKey}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/** Listen for session expiry and auto-save current form state */
export function useSessionExpiryWatcher(formKey: string, getCurrentFormData: () => Record<string, unknown>) {
  const { saveForRecovery } = useSaveFormForRecovery(formKey);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        if (event === "SIGNED_OUT") {
          // Save form data before session loss
          const formData = getCurrentFormData();
          if (formData && Object.keys(formData).length > 0) {
            saveForRecovery(formData);
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [saveForRecovery, getCurrentFormData]);
}
