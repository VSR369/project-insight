/**
 * Accessibility Utilities
 * 
 * Skip links, aria-live announcements, and focus management helpers.
 * WCAG 2.1 AA compliance aids.
 */

import { useCallback, useRef, useEffect } from 'react';

/**
 * SkipLink — visually hidden link that becomes visible on focus.
 * Place at the top of the page to let keyboard users skip navigation.
 */
export function SkipLink({ targetId = 'main-content', label = 'Skip to main content' }: {
  targetId?: string;
  label?: string;
}) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
    >
      {label}
    </a>
  );
}

/**
 * AriaLiveRegion — announces messages to screen readers.
 * Use `politeness="assertive"` for errors, `"polite"` for status updates.
 */
export function AriaLiveRegion({
  message,
  politeness = 'polite',
}: {
  message: string;
  politeness?: 'polite' | 'assertive';
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * useFocusOnError — moves focus to the first error field after form validation fails.
 */
export function useFocusOnError(errors: Record<string, unknown>) {
  const previousErrorCount = useRef(0);

  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0 && errorKeys.length !== previousErrorCount.current) {
      const firstErrorField = document.querySelector<HTMLElement>(
        `[name="${errorKeys[0]}"], [id="${errorKeys[0]}"]`
      );
      firstErrorField?.focus();
    }
    previousErrorCount.current = errorKeys.length;
  }, [errors]);
}

/**
 * useAnnounce — returns a function that announces messages via aria-live.
 * Creates a temporary element, announces, then removes it.
 */
export function useAnnounce() {
  return useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', politeness);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }, []);
}
