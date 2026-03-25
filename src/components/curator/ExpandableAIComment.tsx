/**
 * ExpandableAIComment — Collapsible AI reasoning / explanation panel.
 *
 * Used wherever the AI generates a reasoning comment, summary, or
 * explanation across all curator sections.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const COLLAPSED_HEIGHT = 72;

interface ExpandableAICommentProps {
  content: string;
  defaultExpanded?: boolean;
}

export function ExpandableAIComment({
  content,
  defaultExpanded = false,
}: ExpandableAICommentProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if content overflows the collapsed height
  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      setOverflows(el.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, [content]);

  const sanitized = DOMPurify.sanitize(content);

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
          🤖 AI Reasoning
        </span>
        {overflows && (
          <button
            type="button"
            className="text-amber-600 hover:text-amber-800 transition-colors p-0.5"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative overflow-hidden transition-all duration-300 ease-in-out">
        <div
          ref={contentRef}
          className={cn(
            "text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none",
            expanded ? "max-h-[320px] overflow-y-auto" : "overflow-hidden"
          )}
          style={!expanded && overflows ? { maxHeight: `${COLLAPSED_HEIGHT}px` } : undefined}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />

        {/* Gradient fade when collapsed and overflows */}
        {!expanded && overflows && (
          <div
            className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-amber-50 pointer-events-none"
            aria-hidden
          />
        )}
      </div>

      {/* Show more / Collapse link */}
      {overflows && (
        <button
          type="button"
          className="text-xs text-amber-600 underline hover:text-amber-800 mt-1 inline-flex items-center gap-0.5 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <>Collapse <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Show full reasoning <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
