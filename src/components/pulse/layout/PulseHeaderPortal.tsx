import { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { logWarning } from '@/lib/errorHandler';

const PORTAL_ROOT_ID = 'pulse-header-root';

interface PulseHeaderPortalProps {
  children: React.ReactNode;
  onPortalStatusChange?: (isActive: boolean) => void;
}

/**
 * Gets or creates the dedicated portal root element.
 * This element persists across component remounts for stability.
 */
function getOrCreatePortalRoot(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null;
  }

  let portalRoot = document.getElementById(PORTAL_ROOT_ID);
  
  if (!portalRoot) {
    portalRoot = document.createElement('div');
    portalRoot.id = PORTAL_ROOT_ID;
    // Position at the very top of body, before other content
    document.body.insertBefore(portalRoot, document.body.firstChild);
  }
  
  return portalRoot;
}

/**
 * Portal wrapper that renders the Pulse header into a dedicated, stable DOM node.
 * This decouples the header from nested scroll/overflow contexts and survives
 * component remounts caused by auth state changes or route transitions.
 * 
 * The header is rendered with position: fixed at z-index 1000 to ensure
 * it's always visible above all other content.
 */
export function PulseHeaderPortal({ children, onPortalStatusChange }: PulseHeaderPortalProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const notifiedStatus = useRef<boolean | null>(null);

  // Notify parent of portal status changes
  const notifyStatus = useCallback((isActive: boolean) => {
    if (notifiedStatus.current !== isActive) {
      notifiedStatus.current = isActive;
      onPortalStatusChange?.(isActive);
    }
  }, [onPortalStatusChange]);

  // Initialize portal root on mount
  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      logWarning('PulseHeaderPortal: document not available', {
        operation: 'portal_mount',
        component: 'PulseHeaderPortal',
      });
      notifyStatus(false);
      return;
    }

    const root = getOrCreatePortalRoot();
    if (!root) {
      logWarning('PulseHeaderPortal: could not create portal root', {
        operation: 'portal_mount',
        component: 'PulseHeaderPortal',
      });
      notifyStatus(false);
      return;
    }

    setPortalRoot(root);
    notifyStatus(true);

    // Cleanup: We intentionally do NOT remove the portal root element
    // on unmount to keep it stable across route transitions and remounts.
    // The element is lightweight and having it persist is safer than
    // risking portal attachment failures on rapid remounts.
  }, [notifyStatus]);

  // Measure header height and set CSS variable for layout spacer
  // Using useLayoutEffect to set height before paint
  useLayoutEffect(() => {
    if (!portalRoot || !headerRef.current) return;

    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--pulse-header-height', `${height}px`);
      }
    };

    // Initial measurement
    updateHeight();

    // Re-measure on resize using ResizeObserver if available
    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(updateHeight);
      resizeObserver.observe(headerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    } else {
      // Fallback: listen to window resize
      window.addEventListener('resize', updateHeight);
      return () => {
        window.removeEventListener('resize', updateHeight);
      };
    }
  }, [portalRoot]);

  // Cleanup CSS variable on unmount
  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--pulse-header-height');
    };
  }, []);

  // If portal root is not ready, render inline as fallback
  if (!portalRoot) {
    return (
      <div 
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-[1000]"
        data-testid="pulse-header-portal"
      >
        {children}
      </div>
    );
  }

  return createPortal(
    <div 
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-[1000]"
      data-testid="pulse-header-portal"
    >
      {children}
    </div>,
    portalRoot
  );
}

/**
 * Spacer component to reserve space for the portal-rendered header.
 * Uses CSS variable set by PulseHeaderPortal for accurate height.
 */
export function PulseHeaderSpacer() {
  return (
    <div 
      className="flex-shrink-0"
      style={{ height: 'var(--pulse-header-height, 56px)' }}
      aria-hidden="true"
    />
  );
}
