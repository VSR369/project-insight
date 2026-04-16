/**
 * exportChallengeDocument — Client-side PDF and DOCX export helpers.
 * Produces downloadable files from an HTML string built by `buildExportHtml`.
 */

const sanitizeFilename = (raw: string): string =>
  raw.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'challenge';

const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

/** Render the HTML to a multi-page PDF and trigger download. */
export async function exportAsPdf(html: string, baseFilename: string): Promise<void> {
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = (html2pdfModule as { default: unknown }).default ?? html2pdfModule;

  // html2pdf needs a real DOM node — render off-screen
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = '210mm'; // A4 width
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (html2pdf as any)()
      .from(container)
      .set({
        margin: [12, 10, 14, 10], // top, left, bottom, right (mm)
        filename: `${sanitizeFilename(baseFilename)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'], before: '.export-group', avoid: ['.export-section', 'table', '.export-card'] },
      })
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

/** Convert the HTML to a DOCX blob via html-docx-js-typescript and download it. */
export async function exportAsDocx(html: string, baseFilename: string): Promise<void> {
  const mod = await import('html-docx-js-typescript');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asBlob = (mod as any).asBlob ?? (mod as any).default?.asBlob;
  const result = await asBlob(html, {
    orientation: 'portrait',
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
  });
  const blob: Blob = result instanceof Blob ? result : new Blob([result], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  triggerBlobDownload(blob, `${sanitizeFilename(baseFilename)}.docx`);
}
