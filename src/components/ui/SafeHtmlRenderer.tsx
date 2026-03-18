/**
 * SafeHtmlRenderer — Renders HTML content sanitized with DOMPurify.
 *
 * Use this everywhere rich-text HTML from the database is displayed.
 * Allows safe tags: formatting, headings, lists, images, iframes (YouTube/Vimeo).
 */

import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface SafeHtmlRendererProps {
  html: string | null | undefined;
  className?: string;
  /** Fallback when html is empty/null */
  fallback?: string;
}

/**
 * DOMPurify config: allow formatting tags, images, and embedded video iframes.
 */
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption',
    'iframe', 'div', 'span',
  ],
  ALLOWED_ATTR: [
    'href', 'target', 'rel',
    'src', 'alt', 'title', 'width', 'height',
    'class', 'style',
    'frameborder', 'allow', 'allowfullscreen',
  ],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
};

export function SafeHtmlRenderer({ html, className, fallback = '—' }: SafeHtmlRendererProps) {
  const sanitized = useMemo(() => {
    if (!html?.trim()) return null;
    return DOMPurify.sanitize(html, PURIFY_CONFIG);
  }, [html]);

  if (!sanitized) {
    return <p className="text-sm text-muted-foreground">{fallback}</p>;
  }

  return (
    <div
      className={cn('prose prose-sm max-w-none text-foreground', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
