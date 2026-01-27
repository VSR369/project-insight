/**
 * Dialog Persistence Hook
 * 
 * Provides sessionStorage persistence for dialog open state and form drafts.
 * This ensures dialogs survive component remounts (e.g., auth token refresh).
 * 
 * Per Project Knowledge Section 17 - Foolproof Dialog Stability Pattern
 */

import { useCallback, useEffect, useRef } from "react";
import { logInfo } from "@/lib/errorHandler";

// Storage keys
const DIALOG_SESSION_KEY = "interviewKitDialogSession";
const DRAFT_KEY_PREFIX = "interviewKitQuestionDraft";

export interface DialogSession {
  isOpen: boolean;
  mode: "new" | "edit";
  editingQuestionId: string | null;
  defaultCompetencyId: string | null;
  timestamp: number;
}

export interface QuestionDraft {
  industry_segment_id: string;
  expertise_level_id: string;
  competency_id: string;
  question_text: string;
  expected_answer: string;
  display_order: number;
  is_active: boolean;
  timestamp: number;
}

// Session age limit (30 minutes)
const SESSION_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Get the current dialog session from storage
 */
export function getDialogSession(): DialogSession | null {
  try {
    const raw = sessionStorage.getItem(DIALOG_SESSION_KEY);
    if (!raw) return null;
    
    const session = JSON.parse(raw) as DialogSession;
    
    // Check if session is stale
    if (Date.now() - session.timestamp > SESSION_MAX_AGE_MS) {
      clearDialogSession();
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

/**
 * Save dialog session to storage
 */
export function saveDialogSession(session: Omit<DialogSession, "timestamp">): void {
  try {
    const fullSession: DialogSession = {
      ...session,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(DIALOG_SESSION_KEY, JSON.stringify(fullSession));
    logInfo("Dialog session saved", { 
      operation: "save_dialog_session",
      component: "useDialogPersistence",
    });
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear dialog session from storage
 */
export function clearDialogSession(): void {
  try {
    sessionStorage.removeItem(DIALOG_SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get draft key for a specific question form context
 */
function getDraftKey(mode: "new" | "edit", questionId: string | null): string {
  return `${DRAFT_KEY_PREFIX}:${mode}:${questionId || "new"}`;
}

/**
 * Get draft from storage
 */
export function getQuestionDraft(mode: "new" | "edit", questionId: string | null): QuestionDraft | null {
  try {
    const key = getDraftKey(mode, questionId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    
    const draft = JSON.parse(raw) as QuestionDraft;
    
    // Check if draft is stale
    if (Date.now() - draft.timestamp > SESSION_MAX_AGE_MS) {
      clearQuestionDraft(mode, questionId);
      return null;
    }
    
    return draft;
  } catch {
    return null;
  }
}

/**
 * Save draft to storage
 */
export function saveQuestionDraft(
  mode: "new" | "edit", 
  questionId: string | null, 
  draft: Omit<QuestionDraft, "timestamp">
): void {
  try {
    const key = getDraftKey(mode, questionId);
    const fullDraft: QuestionDraft = {
      ...draft,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(key, JSON.stringify(fullDraft));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear draft from storage
 */
export function clearQuestionDraft(mode: "new" | "edit", questionId: string | null): void {
  try {
    const key = getDraftKey(mode, questionId);
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all drafts and session (for complete cleanup)
 */
export function clearAllDialogData(): void {
  clearDialogSession();
  // Clear all draft keys
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook for debounced draft saving
 */
export function useDraftPersistence(
  mode: "new" | "edit",
  questionId: string | null,
  enabled: boolean
) {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const saveDraft = useCallback((draft: Omit<QuestionDraft, "timestamp">) => {
    if (!enabled) return;
    
    // Debounce saves by 300ms
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveQuestionDraft(mode, questionId, draft);
    }, 300);
  }, [mode, questionId, enabled]);
  
  const clearDraft = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    clearQuestionDraft(mode, questionId);
  }, [mode, questionId]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  return { saveDraft, clearDraft };
}
