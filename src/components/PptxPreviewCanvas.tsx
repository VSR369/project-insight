import { useEffect, useRef, useState } from 'react';
import { Loader2, FileWarning, Download, ChevronLeft, ChevronRight, Presentation } from 'lucide-react';
import { logWarning } from '@/lib/errorHandler';
import { Button } from '@/components/ui/button';

interface SlideData {
  index: number;
  texts: string[];
}

interface PptxPreviewCanvasProps {
  fileData: ArrayBuffer | null;
  blobUrl: string | null;
  fileName: string;
}

/**
 * Minimal PPTX preview — extracts text content from slides using JSZip + XML parsing.
 * Full rich rendering of PPTX in-browser requires complex libraries;
 * this provides a useful text-based preview with download fallback.
 */
export function PptxPreviewCanvas({ fileData, blobUrl, fileName }: PptxPreviewCanvasProps) {
  const [status, setStatus] = useState<'loading' | 'rendered' | 'error'>('loading');
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setStatus('loading');
    setSlides([]);
    setCurrentSlide(0);

    if (!fileData) return;

    const timeout = setTimeout(() => {
      if (!cancelledRef.current) setStatus('error');
    }, 20000);

    async function parse() {
      try {
        // PPTX is a ZIP containing XML slides
        const JSZip = (await import('jszip')).default;
        if (cancelledRef.current) return;

        const zip = await JSZip.loadAsync(fileData!);
        const slideFiles = Object.keys(zip.files)
          .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
            return numA - numB;
          });

        if (slideFiles.length === 0) {
          if (!cancelledRef.current) setStatus('error');
          clearTimeout(timeout);
          return;
        }

        const parsed: SlideData[] = [];
        for (let i = 0; i < slideFiles.length; i++) {
          if (cancelledRef.current) return;
          const xml = await zip.files[slideFiles[i]].async('text');
          // Extract text from <a:t> tags
          const texts: string[] = [];
          const regex = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
          let match: RegExpExecArray | null;
          while ((match = regex.exec(xml)) !== null) {
            const text = match[1].trim();
            if (text) texts.push(text);
          }
          parsed.push({ index: i + 1, texts });
        }

        if (cancelledRef.current) return;
        setSlides(parsed);
        setStatus('rendered');
      } catch (err) {
        logWarning('PPTX parse failed', { operation: 'pptx_preview', additionalData: { error: String(err) } });
        if (!cancelledRef.current) setStatus('error');
      } finally {
        clearTimeout(timeout);
      }
    }

    parse();

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

  const slide = slides[currentSlide];

  return (
    <div className="relative flex-1 min-h-0 w-full flex flex-col bg-muted/30">
      {status === 'loading' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-muted-foreground bg-background/60">
          <FileWarning className="h-12 w-12" />
          <p className="text-sm">Could not parse this presentation.</p>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!blobUrl}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        </div>
      )}

      {/* Slide content */}
      <div className={`flex-1 min-h-0 overflow-auto flex items-center justify-center p-6 ${status !== 'rendered' ? 'invisible' : ''}`}>
        {slide && (
          <div className="w-full max-w-2xl bg-background rounded-lg shadow-md border border-border p-8 min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
              <Presentation className="h-4 w-4" />
              <span>Slide {slide.index} of {slides.length}</span>
            </div>
            <div className="flex-1 space-y-2">
              {slide.texts.length > 0 ? (
                slide.texts.map((text, i) => (
                  <p key={i} className={`${i === 0 ? 'text-lg font-semibold text-foreground' : 'text-sm text-muted-foreground'}`}>
                    {text}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic">No text content on this slide</p>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground italic">
              Text-only preview · Download for full formatting
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      {status === 'rendered' && slides.length > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-2 py-3">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentSlide <= 0}
            onClick={() => setCurrentSlide((p) => p - 1)}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[100px] text-center">
            Slide {currentSlide + 1} of {slides.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentSlide >= slides.length - 1}
            onClick={() => setCurrentSlide((p) => p + 1)}
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
