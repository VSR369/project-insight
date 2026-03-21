/**
 * AiContentRenderer — Renders AI-generated content with rich formatting.
 *
 * Auto-detects content type (HTML, Markdown, or plain text) and renders
 * with proper typography: headings, lists, bold/italic, code blocks,
 * tables, and callout blockquotes.
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SafeHtmlRenderer } from '@/components/ui/SafeHtmlRenderer';
import { StructuredRenderer } from '@/components/ui/AiStructuredCards';
import { cn } from '@/lib/utils';

interface AiContentRendererProps {
  /** Raw AI output — may be HTML, Markdown, or plain text */
  content: string | null | undefined;
  /** Additional CSS classes */
  className?: string;
  /** Fallback when content is empty/null */
  fallback?: string;
  /** Compact mode reduces heading sizes */
  compact?: boolean;
}

/**
 * Detect whether content is HTML (has tags), Markdown (has markers), or plain text.
 */
function tryParseJSON(content: string): Record<string, unknown> | Record<string, unknown>[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return null;
  } catch {
    return null;
  }
}

function detectFormat(content: string): 'json' | 'html' | 'markdown' | 'plain' {
  const trimmed = content.trim();

  // JSON detection first
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && tryParseJSON(trimmed)) {
    return 'json';
  }

  // Check for HTML tags (but not markdown angle brackets in blockquotes)
  if (/<(?:p|div|h[1-6]|ul|ol|li|table|br|strong|em|img|a|span|blockquote)\b[^>]*>/i.test(trimmed)) {
    return 'html';
  }

  // Check for markdown markers
  const markdownPatterns = [
    /^#{1,6}\s/m,
    /^\s*[-*+]\s/m,
    /^\s*\d+\.\s/m,
    /\*\*[^*]+\*\*/,
    /\*[^*]+\*/,
    /\|.+\|/m,
    /^>\s/m,
    /```/,
    /`[^`]+`/,
    /^\s*---\s*$/m,
  ];

  if (markdownPatterns.some((p) => p.test(trimmed))) {
    return 'markdown';
  }

  return 'plain';
}

export function AiContentRenderer({
  content,
  className,
  fallback = '—',
  compact = false,
}: AiContentRendererProps) {
  const format = useMemo(() => {
    if (!content?.trim()) return null;
    return detectFormat(content);
  }, [content]);

  if (!format || !content?.trim()) {
    return <p className="text-sm text-muted-foreground">{fallback}</p>;
  }

  const proseClasses = cn(
    'editor-content ai-content-prose',
    'max-w-none',
    compact && '[&]:text-[13px] [&]:leading-[1.7] [&]:p-0 [&]:min-h-0',
    !compact && '[&]:p-0 [&]:min-h-0',
    className,
  );

  if (format === 'json') {
    const parsed = tryParseJSON(content);
    if (parsed) {
      return <StructuredRenderer data={parsed} className={className} />;
    }
  }

  if (format === 'html') {
    return <SafeHtmlRenderer html={content} className={proseClasses} />;
  }

  if (format === 'markdown') {
    return (
      <div className={proseClasses}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  // Plain text — preserve line breaks
  return (
    <div className={cn('text-sm text-foreground whitespace-pre-line leading-relaxed', className)}>
      {content}
    </div>
  );
}
