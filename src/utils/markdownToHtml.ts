/**
 * markdownToHtml — Purpose-built Markdown-to-HTML converter for AI content.
 * Handles callout detection, table parsing, code blocks, and inline formatting
 * optimized for Tiptap editor consumption.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function inlineFormat(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

export function markdownToHtml(markdown: string): string {
  if (!markdown?.trim()) return '<p><br></p>';

  const lines = markdown.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Headings H1–H4
    if (/^#{1,4}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#{1,4})\s/)?.[1].length || 1;
      const text = trimmed.replace(/^#{1,4}\s+/, '');
      output.push(`<h${level}>${inlineFormat(text)}</h${level}>`);
      i++; continue;
    }

    // Fenced code blocks
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      output.push(`<pre><code class="language-${lang || 'text'}">${codeLines.join('\n')}</code></pre>`);
      i++; continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      output.push(`<blockquote>${quoteLines.map(l => inlineFormat(l)).join('<br>')}</blockquote>`);
      continue;
    }

    // Horizontal rules
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmed)) {
      output.push('<hr>');
      i++; continue;
    }

    // Unordered lists
    if (/^[*\-+]\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[*\-+]\s/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^[*\-+]\s+/, ''))}</li>`);
        i++;
      }
      output.push(`<ul>${items.join('')}</ul>`);
      continue;
    }

    // Ordered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      output.push(`<ol>${items.join('')}</ol>`);
      continue;
    }

    // Markdown tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim()
          .split('|')
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map(c => c.trim());
        if (!cells.every(c => /^[-:]+$/.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length > 0) {
        const [headerRow, ...bodyRows] = rows;
        const thead = `<thead><tr>${headerRow.map(c => `<th>${inlineFormat(c)}</th>`).join('')}</tr></thead>`;
        const tbody = bodyRows.length
          ? `<tbody>${bodyRows.map(row => `<tr>${row.map(c => `<td>${inlineFormat(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
          : '';
        output.push(`<table>${thead}${tbody}</table>`);
      }
      continue;
    }

    // Callout patterns (AI-specific: **NOTE:**, **WARNING:**, etc.)
    const calloutMatch = trimmed.match(/^\*\*(NOTE|WARNING|TIP|IMPORTANT|DANGER|ALERT):\*\*\s*(.*)/i);
    if (calloutMatch) {
      const type = calloutMatch[1].toUpperCase();
      const msg = calloutMatch[2];
      const typeMap: Record<string, string> = {
        NOTE: 'callout-info', TIP: 'callout-info',
        WARNING: 'callout-warning', IMPORTANT: 'callout-warning',
        DANGER: 'callout-danger', ALERT: 'callout-danger',
      };
      output.push(`<div class="callout ${typeMap[type] || 'callout-info'}"><strong>${type}:</strong> ${inlineFormat(msg)}</div>`);
      i++; continue;
    }

    // Paragraphs (collect contiguous non-block lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,4}\s/.test(lines[i].trim()) &&
      !/^[*\-+]\s/.test(lines[i].trim()) &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('> ') &&
      !lines[i].trim().startsWith('|') &&
      !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length) {
      output.push(`<p>${inlineFormat(paraLines.join(' '))}</p>`);
    }
  }

  return output.join('\n') || '<p><br></p>';
}
