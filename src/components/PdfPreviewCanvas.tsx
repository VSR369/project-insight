import { useEffect, useRef, useState } from 'react';
import { Loader2, FileWarning, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfPreviewCanvasProps {
  pdfData: ArrayBuffer | null;
  blobUrl: string | null;
  fileName: string;
}

export function PdfPreviewCanvas({ pdfData, blobUrl, fileName }: PdfPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'rendered' | 'error'>('loading');
  const [pageInfo, setPageInfo] = useState('');
  const renderTaskRef = useRef<number>(0);

  useEffect(() => {
    if (!pdfData) {
      setStatus('loading');
      return;
    }

    const taskId = ++renderTaskRef.current;
    let cancelled = false;

    async function renderPdf() {
      try {
        setStatus('loading');
        const pdfjsLib = await import('pdfjs-dist');

        // Configure worker using CDN (bundler-safe)
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice(0) });
        const pdf = await loadingTask.promise;

        if (cancelled || taskId !== renderTaskRef.current) return;

        const page = await pdf.getPage(1);
        if (cancelled || taskId !== renderTaskRef.current) return;

        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Scale to fit container width with devicePixelRatio for crisp text
        const containerWidth = container.clientWidth || 800;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / unscaledViewport.width;
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (cancelled || taskId !== renderTaskRef.current) return;

        setPageInfo(`Page 1 of ${pdf.numPages}`);
        setStatus('rendered');
      } catch (err) {
        if (!cancelled && taskId === renderTaskRef.current) {
          console.error('PDF render failed:', err);
          setStatus('error');
        }
      }
    }

    renderPdf();
    return () => { cancelled = true; };
  }, [pdfData]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileWarning className="h-12 w-12" />
        <p className="text-sm">Could not render this PDF.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!blobUrl}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
          {blobUrl && (
            <Button variant="link" size="sm" onClick={() => window.open(blobUrl, '_blank')}>
              Open in new tab
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-auto flex flex-col items-center bg-muted/30 p-4">
      <canvas ref={canvasRef} className="max-w-full rounded shadow-sm" />
      {pageInfo && (
        <p className="text-xs text-muted-foreground mt-2">{pageInfo}</p>
      )}
    </div>
  );
}
