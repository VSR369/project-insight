/**
 * aiContentFormatter — Normalizes AI output into rich HTML for editor experiences.
 * Converts markdown/plain text into structured HTML so editing behaves like a Word-style document.
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;
const MARKDOWN_HINT_REGEX = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|\*\*|__|`{1,3}|~~|\|.+\|/m;

marked.setOptions({ gfm: true, breaks: true });

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/**
 * Converts AI output (HTML/Markdown/plain) into sanitized HTML suitable for RichTextEditor.
 */
export function normalizeAiContentForEditor(input: string | null | undefined): string {
  const trimmed = input?.trim();
  if (!trimmed) return '';

  if (HTML_TAG_REGEX.test(trimmed)) {
    return DOMPurify.sanitize(trimmed);
  }

  if (MARKDOWN_HINT_REGEX.test(trimmed)) {
    const parsed = marked.parse(trimmed);
    const html = typeof parsed === 'string' ? parsed : '';
    return DOMPurify.sanitize(html);
  }

  return DOMPurify.sanitize(plainTextToHtml(trimmed));
}
