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
  const renderTaskRef = useRef<any>(null);
  const loadingTaskRef = useRef<any>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const clearTimeoutSafe = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const renderPage = useCallback(async (pageNum: number): Promise<boolean> => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!pdf || !canvas || !container) return false;

    // Cancel any in-flight render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }

    try {
      const page = await pdf.getPage(pageNum);
      if (cancelledRef.current) return false;

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
      if (!ctx) return false;

      const task = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise;

      if (cancelledRef.current) return false;
      renderTaskRef.current = null;
      return true;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') return false;
      console.error('PDF page render failed:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    setStatus('loading');
    setCurrentPage(1);
    setTotalPages(0);
    pdfDocRef.current = null;
    clearTimeoutSafe();

    if (!pdfData) return;

    // Start timeout — only cleared on terminal state or unmount
    timeoutRef.current = setTimeout(() => {
      if (!cancelledRef.current) {
        console.error('PDF render timed out after 15s');
        setStatus('error');
      }
    }, 15000);

    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        if (cancelledRef.current) return;

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const loadTask = pdfjsLib.getDocument({ data: pdfData!.slice(0) });
        loadingTaskRef.current = loadTask;
        const pdf = await loadTask.promise;

        if (cancelledRef.current) return;

        pdfDocRef.current = pdf;
        loadingTaskRef.current = null;
        setTotalPages(pdf.numPages);

        const ok = await renderPage(1);
        if (cancelledRef.current) return;

        if (ok) {
          setCurrentPage(1);
          setStatus('rendered');
          clearTimeoutSafe();
        } else {
          setStatus('error');
          clearTimeoutSafe();
        }
      } catch (err) {
        if (!cancelledRef.current) {
          console.error('PDF load failed:', err);
          setStatus('error');
          clearTimeoutSafe();
        }
      }
    }

    loadPdf();

    return () => {
      cancelledRef.current = true;
      clearTimeoutSafe();
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
        renderTaskRef.current = null;
      }
      if (loadingTaskRef.current) {
        try { loadingTaskRef.current.destroy(); } catch {}
        loadingTaskRef.current = null;
      }
    };
  }, [pdfData, renderPage, clearTimeoutSafe]);

  const goToPage = useCallback(async (pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages || !pdfDocRef.current) return;
    setStatus('loading');
    const ok = await renderPage(pageNum);
    if (ok) {
      setCurrentPage(pageNum);
      setStatus('rendered');
    } else {
      setStatus('error');
    }
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

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 w-full flex flex-col items-center bg-muted/30"
    >
      {/* Loading overlay */}
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error overlay */}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background/60">
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
      )}

      {/* Always-mounted canvas area */}
      <div className="flex-1 min-h-0 w-full overflow-auto flex items-start justify-center p-4">
        <canvas
          ref={canvasRef}
          className={`max-w-full rounded shadow-sm ${status !== 'rendered' ? 'invisible' : ''}`}
        />
      </div>

      {/* Page navigation */}
      {status === 'rendered' && totalPages > 1 && (
        <div className="shrink-0 flex items-center gap-2 py-3">
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
