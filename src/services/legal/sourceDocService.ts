/**
 * sourceDocService — Pure helpers for source legal document handling.
 * Used by useSourceDocs hook. NO Supabase calls live here.
 */
import mammoth from 'mammoth';

export const SOURCE_DOC_CONFIG = {
  maxSizeBytes: 10 * 1024 * 1024,
  maxSizeMB: 10,
  // PDF temporarily disabled — text extraction is not yet implemented and
  // accepting PDFs leads to silently-empty source documents (see plan).
  allowedTypes: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ] as readonly string[],
  allowedExtensions: ['.docx', '.txt'] as readonly string[],
  label: 'Source Legal Document',
  helperText: 'DOCX or TXT only — PDF support is coming soon.',
};

export type SourceOrigin = 'creator' | 'curator' | 'lc' | 'platform_template';

export interface ParsedSourceDoc {
  contentHtml: string | null;
  isPdf: boolean;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function txtToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (!trimmed) return '';
      const escaped = escapeHtml(trimmed).replace(/\n/g, '<br />');
      return `<p>${escaped}</p>`;
    })
    .filter(Boolean)
    .join('');
}

export function validateSourceFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!SOURCE_DOC_CONFIG.allowedExtensions.includes(ext)) {
    return `Unsupported file type. Allowed: ${SOURCE_DOC_CONFIG.allowedExtensions.join(', ')}`;
  }
  if (file.size > SOURCE_DOC_CONFIG.maxSizeBytes) {
    return `File exceeds the ${SOURCE_DOC_CONFIG.maxSizeMB} MB limit`;
  }
  return null;
}

export async function parseFileToHtml(file: File): Promise<ParsedSourceDoc> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'txt') {
    const text = await file.text();
    return { contentHtml: txtToHtml(text), isPdf: false };
  }
  if (ext === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return { contentHtml: result.value, isPdf: false };
  }
  if (ext === 'pdf') {
    return { contentHtml: null, isPdf: true };
  }
  throw new Error(`Unsupported file type: .${ext}`);
}

/** Concatenate source-doc HTML for the manual fallback path (display-only). */
export function concatenateSourceDocs(
  docs: Array<{ document_name: string | null; content_html: string | null }>,
): string {
  const parts = docs
    .filter((d) => !!d.content_html)
    .map(
      (d) =>
        `<h2>${escapeHtml(d.document_name ?? 'Source Document')}</h2>${d.content_html}`,
    );
  return parts.join('<hr />');
}

export const ORIGIN_LABEL: Record<SourceOrigin, string> = {
  creator: 'Creator',
  curator: 'Curator',
  lc: 'Legal Coordinator',
  platform_template: 'Platform Template',
};
