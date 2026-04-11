/**
 * Section navigation event system — dispatches and listens for
 * cross-component "navigate to section" events without prop drilling.
 */

import { useEffect } from 'react';

const EVENT_NAME = 'cogni:navigate-to-section';

interface NavigateSectionDetail {
  sectionKey: string;
}

export function dispatchNavigateToSection(sectionKey: string): void {
  window.dispatchEvent(
    new CustomEvent<NavigateSectionDetail>(EVENT_NAME, {
      detail: { sectionKey },
    }),
  );
}

export function useSectionNavigationListener(
  callback: (sectionKey: string) => void,
): void {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NavigateSectionDetail>).detail;
      callback(detail.sectionKey);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [callback]);
}
