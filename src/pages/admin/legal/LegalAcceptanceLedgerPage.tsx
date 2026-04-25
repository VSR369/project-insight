/**
 * LegalAcceptanceLedgerPage — Admin viewer for legal_acceptance_log.
 *
 * Provides forensic visibility into every accepted/declined legal
 * agreement (PMA, SPA, SKPA, PWA, CPA), with filters and pagination.
 */
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollText, ChevronLeft, ChevronRight, AlertCircle, Download, Loader2 } from 'lucide-react';
import { LedgerFiltersBar } from '@/components/admin/legal/LedgerFiltersBar';
import { LedgerTable } from '@/components/admin/legal/LedgerTable';
import {
  useLegalAcceptanceLedger,
  type LedgerFilters,
} from '@/hooks/queries/useLegalAcceptanceLedger';
import { useExportLegalLedger } from '@/hooks/legal/useExportLegalLedger';
import { LEDGER_PAGE_SIZE } from '@/constants/legalLedger.constants';

const INITIAL = {
  documentCode: 'all',
  triggerEvent: 'all',
  userIdSearch: '',
  fromDate: '',
  toDate: '',
};

export default function LegalAcceptanceLedgerPage() {
  const [documentCode, setDocumentCode] = useState(INITIAL.documentCode);
  const [triggerEvent, setTriggerEvent] = useState(INITIAL.triggerEvent);
  const [userIdSearch, setUserIdSearch] = useState(INITIAL.userIdSearch);
  const [fromDate, setFromDate] = useState(INITIAL.fromDate);
  const [toDate, setToDate] = useState(INITIAL.toDate);
  const [page, setPage] = useState(0);

  const filters: LedgerFilters = useMemo(
    () => ({
      documentCode: documentCode === 'all' ? null : documentCode,
      triggerEvent: triggerEvent === 'all' ? null : triggerEvent,
      userIdSearch: userIdSearch.trim() || null,
      fromDate: fromDate || null,
      toDate: toDate || null,
      page,
      pageSize: LEDGER_PAGE_SIZE,
    }),
    [documentCode, triggerEvent, userIdSearch, fromDate, toDate, page],
  );

  const { data, isLoading, isError, error, refetch } = useLegalAcceptanceLedger(filters);

  const handleReset = useCallback(() => {
    setDocumentCode(INITIAL.documentCode);
    setTriggerEvent(INITIAL.triggerEvent);
    setUserIdSearch(INITIAL.userIdSearch);
    setFromDate(INITIAL.fromDate);
    setToDate(INITIAL.toDate);
    setPage(0);
  }, []);

  const total = data?.total ?? 0;
  const rows = data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(total / LEDGER_PAGE_SIZE));
  const startIdx = total === 0 ? 0 : page * LEDGER_PAGE_SIZE + 1;
  const endIdx = Math.min((page + 1) * LEDGER_PAGE_SIZE, total);

  return (
    <div className="container mx-auto p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold">Legal Acceptance Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Forensic record of every accepted or declined legal agreement.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <LedgerFiltersBar
            documentCode={documentCode}
            triggerEvent={triggerEvent}
            userIdSearch={userIdSearch}
            fromDate={fromDate}
            toDate={toDate}
            onDocumentCodeChange={(v) => { setDocumentCode(v); setPage(0); }}
            onTriggerEventChange={(v) => { setTriggerEvent(v); setPage(0); }}
            onUserIdSearchChange={(v) => { setUserIdSearch(v); setPage(0); }}
            onFromDateChange={(v) => { setFromDate(v); setPage(0); }}
            onToDateChange={(v) => { setToDate(v); setPage(0); }}
            onReset={handleReset}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Acceptances{' '}
            <span className="text-xs font-normal text-muted-foreground">
              ({total.toLocaleString()} total)
            </span>
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{startIdx}–{endIdx} of {total.toLocaleString()}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || isLoading}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-mono">{page + 1} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages || isLoading}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : 'Failed to load ledger.'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <ScrollText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No acceptances match the current filters.
              </p>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Clear filters
              </Button>
            </div>
          ) : (
            <LedgerTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
