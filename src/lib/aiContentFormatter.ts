/**
 * aiContentFormatter — Normalizes AI output into rich HTML for editor experiences.
 * Converts markdown/plain text into structured HTML so editing behaves like a Word-style document.
 */

import DOMPurify from 'dompurify';
import { markdownToHtml } from '@/utils/markdownToHtml';

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const MARKDOWN_HINT_REGEX = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\*\*|__|`{1,3}|~~|\|.+\|/m;

/**
 * Converts AI output (HTML/Markdown/plain) into sanitized HTML suitable for RichTextEditor.
 */
export function normalizeAiContentForEditor(input: string | null | undefined): string {
  const trimmed = input?.trim();
  if (!trimmed) return '';

  // Already HTML — sanitize and pass through
  if (HTML_TAG_REGEX.test(trimmed)) {
    return DOMPurify.sanitize(trimmed);
  }

  // Markdown detected — convert with custom parser
  if (MARKDOWN_HINT_REGEX.test(trimmed)) {
    const html = markdownToHtml(trimmed);
    return DOMPurify.sanitize(html);
  }

  // Plain text — wrap paragraphs
  const plainHtml = trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = paragraph
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      return `<p>${escaped.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');

  return DOMPurify.sanitize(plainHtml);
}
