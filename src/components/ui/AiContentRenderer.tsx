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
function detectFormat(content: string): 'html' | 'markdown' | 'plain' {
  const trimmed = content.trim();

  // Check for HTML tags (but not markdown angle brackets in blockquotes)
  if (/<(?:p|div|h[1-6]|ul|ol|li|table|br|strong|em|img|a|span|blockquote)\b[^>]*>/i.test(trimmed)) {
    return 'html';
  }

  // Check for markdown markers
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Headings
    /^\s*[-*+]\s/m,         // Unordered lists
    /^\s*\d+\.\s/m,         // Ordered lists
    /\*\*[^*]+\*\*/,        // Bold
    /\*[^*]+\*/,            // Italic
    /\|.+\|/m,             // Tables
    /^>\s/m,                // Blockquotes
    /```/,                  // Code blocks
    /`[^`]+`/,             // Inline code
    /^\s*---\s*$/m,         // Horizontal rules
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
    'ai-content-prose',
    compact ? 'prose prose-sm' : 'prose prose-sm lg:prose-base',
    'max-w-none text-foreground',
    // Heading styles
    'prose-headings:text-foreground prose-headings:font-semibold',
    'prose-h1:text-lg prose-h1:border-b prose-h1:border-border prose-h1:pb-2 prose-h1:mb-3',
    'prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2',
    'prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1',
    // List styles
    'prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
    // Strong/em
    'prose-strong:text-foreground prose-strong:font-semibold',
    'prose-em:text-muted-foreground',
    // Code
    'prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono',
    'prose-pre:bg-muted prose-pre:rounded-md prose-pre:p-3',
    // Links
    'prose-a:text-primary prose-a:underline prose-a:underline-offset-2',
    // Paragraphs
    'prose-p:leading-relaxed prose-p:my-1.5',
    className,
  );

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
