/**
 * LegalDocumentViewer — Renders legal HTML content with contract-grade styling.
 * Used in both the acceptance modal and admin preview.
 */
import * as React from 'react';
import '@/styles/legal-document.css';

interface LegalDocumentViewerProps {
  content: string;
  onScrollProgress?: (progress: number) => void;
  className?: string;
}

export function LegalDocumentViewer({ content, onScrollProgress, className }: LegalDocumentViewerProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el || !onScrollProgress) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      onScrollProgress(100);
      return;
    }
    const progress = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
    onScrollProgress(progress);
  }, [onScrollProgress]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // If content fits without scroll, report 100%
    if (el.scrollHeight <= el.clientHeight && onScrollProgress) {
      onScrollProgress(100);
    }
  }, [content, onScrollProgress]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={`overflow-y-auto ${className ?? ''}`}
    >
      <div className="legal-doc-page">
        <div
          className="legal-doc"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}
