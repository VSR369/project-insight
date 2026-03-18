/**
 * ScrollToAcceptLegal — BR-LGL-007 compliant scroll-to-bottom legal acceptance.
 * Checkbox is disabled until user scrolls to the bottom of the document.
 * Shows a subtle arrow indicator prompting the user to scroll.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

/* ─── Types ──────────────────────────────────────────────── */

interface ScrollToAcceptLegalProps {
  /** The legal document text to display */
  documentContent: string;
  /** Whether the user has accepted (controlled) */
  accepted: boolean;
  /** Callback when acceptance changes */
  onAcceptedChange: (accepted: boolean) => void;
  /** Callback when scroll-confirmed state changes */
  onScrollConfirmed?: (confirmed: boolean) => void;
  /** Label for the checkbox */
  acceptLabel?: string;
  /** Max height of the scrollable container */
  maxHeight?: number;
}

/* ─── Component ──────────────────────────────────────────── */

export function ScrollToAcceptLegal({
  documentContent,
  accepted,
  onAcceptedChange,
  onScrollConfirmed,
  acceptLabel = 'I have read and agree to the Non-Disclosure Agreement and IP terms.',
  maxHeight = 400,
}: ScrollToAcceptLegalProps) {
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 10;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    if (atBottom && !scrolledToBottom) {
      setScrolledToBottom(true);
      onScrollConfirmed?.(true);
    }
  }, [scrolledToBottom, onScrollConfirmed]);

  // Check on mount in case content fits without scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // If content doesn't overflow, auto-confirm scroll
    if (el.scrollHeight <= el.clientHeight + 10) {
      setScrolledToBottom(true);
      onScrollConfirmed?.(true);
    }
  }, [documentContent, onScrollConfirmed]);

  return (
    <div className="space-y-3">
      {/* Scrollable document container */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="overflow-y-auto border border-border rounded-lg p-4 text-sm text-foreground whitespace-pre-line leading-relaxed bg-muted/20"
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {documentContent}
        </div>

        {/* Scroll indicator */}
        {!scrolledToBottom && (
          <div className="absolute bottom-0 inset-x-0 rounded-b-lg bg-gradient-to-t from-background via-background/80 to-transparent h-14 flex items-end justify-center pb-2 pointer-events-none">
            <Badge
              variant="secondary"
              className="text-[11px] animate-bounce pointer-events-auto shadow-sm"
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Scroll to read the full document before accepting
            </Badge>
          </div>
        )}
      </div>

      {/* Acceptance checkbox */}
      <div className="flex items-start gap-2.5">
        <Checkbox
          id="scroll-accept-terms"
          checked={accepted}
          onCheckedChange={(v) => onAcceptedChange(v === true)}
          disabled={!scrolledToBottom}
          className="mt-0.5"
        />
        <label
          htmlFor="scroll-accept-terms"
          className={cn(
            'text-xs cursor-pointer leading-tight select-none',
            scrolledToBottom ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {acceptLabel}
        </label>
      </div>
    </div>
  );
}
