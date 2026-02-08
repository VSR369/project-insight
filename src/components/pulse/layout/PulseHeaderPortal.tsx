import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { logWarning } from '@/lib/errorHandler';

interface PulseHeaderPortalProps {
  children: React.ReactNode;
}

/**
 * Portal wrapper that renders the Pulse header directly into document.body.
 * This decouples the header from nested scroll/overflow contexts that can
 * cause clipping issues in iframe/preview environments.
 * 
 * The header is rendered with position: fixed at z-index 1000 to ensure
 * it's always visible above all other content.
 */
export function PulseHeaderPortal({ children }: PulseHeaderPortalProps) {
  const [mounted, setMounted] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // SSR safety check
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      logWarning('PulseHeaderPortal: document not available', {
        operation: 'portal_mount',
        component: 'PulseHeaderPortal',
      });
      return;
    }
    setMounted(true);
  }, []);

  // Measure header height and set CSS variable for layout spacer
  useEffect(() => {
    if (!mounted || !headerRef.current) return;

    const updateHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--pulse-header-height', `${height}px`);
      }
    };

    // Initial measurement
    updateHeight();

    // Re-measure on resize
    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(headerRef.current);

    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty('--pulse-header-height');
    };
  }, [mounted]);

  if (!mounted) {
    // Fallback: render inline if portal can't mount (SSR or edge case)
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
    document.body
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
