import { useEffect, useRef, useState } from 'react';
import { Loader2, FileWarning, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DocxPreviewCanvasProps {
  fileData: ArrayBuffer | null;
  blobUrl: string | null;
  fileName: string;
}

export function DocxPreviewCanvas({ fileData, blobUrl, fileName }: DocxPreviewCanvasProps) {
  const [status, setStatus] = useState<'loading' | 'rendered' | 'error'>('loading');
  const [html, setHtml] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setStatus('loading');
    setHtml('');

    if (!fileData) return;

    const timeout = setTimeout(() => {
      if (!cancelledRef.current) setStatus('error');
    }, 20000);

    async function convert() {
      try {
        const mammoth = await import('mammoth');
        if (cancelledRef.current) return;

        const result = await mammoth.convertToHtml({ arrayBuffer: fileData! });
        if (cancelledRef.current) return;

        setHtml(result.value);
        setStatus('rendered');
      } catch (err) {
        console.error('DOCX render failed:', err);
        if (!cancelledRef.current) setStatus('error');
      } finally {
        clearTimeout(timeout);
      }
    }

    convert();

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeout);
    };
  }, [fileData]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-h-0 w-full flex flex-col bg-muted/30">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background/60">
          <FileWarning className="h-12 w-12" />
          <p className="text-sm">Could not render this document.</p>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!blobUrl}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        </div>
      )}
      <div
        className={`flex-1 min-h-0 overflow-auto p-6 prose prose-sm max-w-none dark:prose-invert ${status !== 'rendered' ? 'invisible' : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
