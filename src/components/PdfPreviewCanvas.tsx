import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, FileWarning, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<number>(0);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdf || !canvas || !container) return;

    try {
      const page = await pdf.getPage(pageNum);
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
    } catch (err) {
      console.error('PDF page render failed:', err);
    }
  }, []);

  useEffect(() => {
    if (!pdfData) {
      setStatus('loading');
      return;
    }

    const taskId = ++renderTaskRef.current;
    let cancelled = false;

    async function loadPdf() {
      try {
        setStatus('loading');
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument({ data: pdfData.slice(0) });
        const pdf = await loadingTask.promise;

        if (cancelled || taskId !== renderTaskRef.current) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);
        setCurrentPage(1);

        // Render first page
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const page = await pdf.getPage(1);
        if (cancelled || taskId !== renderTaskRef.current) return;

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
        setStatus('rendered');
      } catch (err) {
        if (!cancelled && taskId === renderTaskRef.current) {
          console.error('PDF render failed:', err);
          setStatus('error');
        }
      }
    }

    const timeout = setTimeout(() => {
      if (!cancelled && taskId === renderTaskRef.current) {
        console.error('PDF render timed out after 15s');
        setStatus('error');
      }
    }, 15000);

    loadPdf().finally(() => clearTimeout(timeout));
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [pdfData]);

  const goToPage = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    renderPage(pageNum);
  }, [totalPages, renderPage]);

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
      {totalPages > 0 && (
        <div className="flex items-center gap-2 mt-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
