import { useEffect, useRef, useState } from 'react';
import { Loader2, FileWarning, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SheetData {
  name: string;
  rows: string[][];
}

interface XlsxPreviewCanvasProps {
  fileData: ArrayBuffer | null;
  blobUrl: string | null;
  fileName: string;
}

export function XlsxPreviewCanvas({ fileData, blobUrl, fileName }: XlsxPreviewCanvasProps) {
  const [status, setStatus] = useState<'loading' | 'rendered' | 'error'>('loading');
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setStatus('loading');
    setSheets([]);
    setActiveSheet(0);

    if (!fileData) return;

    const timeout = setTimeout(() => {
      if (!cancelledRef.current) setStatus('error');
    }, 20000);

    async function parse() {
      try {
        const XLSX = await import('xlsx');
        if (cancelledRef.current) return;

        const wb = XLSX.read(fileData, { type: 'array' });
        const parsed: SheetData[] = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
          return { name, rows: rows.slice(0, 500) }; // Limit rows for performance
        });

        if (cancelledRef.current) return;
        setSheets(parsed);
        setStatus('rendered');
      } catch (err) {
        console.error('XLSX render failed:', err);
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

  const sheet = sheets[activeSheet];

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
          <p className="text-sm">Could not render this spreadsheet.</p>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!blobUrl}>
            <Download className="h-4 w-4 mr-1" /> Download
          </Button>
        </div>
      )}

      {/* Sheet tabs */}
      {status === 'rendered' && sheets.length > 1 && (
        <div className="shrink-0 flex items-center gap-1 px-4 pt-3 overflow-x-auto">
          {sheets.map((s, i) => (
            <Button
              key={s.name}
              variant={i === activeSheet ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7 px-3"
              onClick={() => setActiveSheet(i)}
            >
              {s.name}
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className={`flex-1 min-h-0 overflow-auto p-4 ${status !== 'rendered' ? 'invisible' : ''}`}>
        {sheet && sheet.rows.length > 0 ? (
          <div className="relative w-full overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                {sheet.rows[0] && (
                  <tr>
                    <th className="sticky top-0 bg-muted border border-border px-2 py-1.5 text-left font-semibold text-muted-foreground w-10">#</th>
                    {sheet.rows[0].map((cell, ci) => (
                      <th key={ci} className="sticky top-0 bg-muted border border-border px-2 py-1.5 text-left font-semibold text-foreground whitespace-nowrap">
                        {cell || '\u00A0'}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {sheet.rows.slice(1).map((row, ri) => (
                  <tr key={ri} className="hover:bg-muted/50">
                    <td className="border border-border px-2 py-1 text-muted-foreground">{ri + 2}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-border px-2 py-1 whitespace-nowrap">
                        {cell || '\u00A0'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">Empty sheet</p>
        )}
      </div>

      {/* Row count */}
      {status === 'rendered' && sheet && (
        <div className="shrink-0 px-4 py-2 text-xs text-muted-foreground border-t border-border">
          {sheet.rows.length - 1} rows · Sheet: {sheet.name}
        </div>
      )}
    </div>
  );
}
