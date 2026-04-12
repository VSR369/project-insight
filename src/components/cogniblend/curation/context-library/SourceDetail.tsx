/**
 * SourceDetail — Right panel showing detail tabs for a selected source.
 * Includes extraction status banner, per-tab empty states, and polling.
 */

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Trash2, CheckCircle, Clock, XCircle, RefreshCw, Download,
  AlertTriangle, Info, Lock, Globe,
} from 'lucide-react';
import { SECTION_LABELS, displayName, type ContextSource } from './types';

const POLL_INTERVAL_MS = 3000;

interface SourceDetailProps {
  source: ContextSource;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (source: ContextSource) => void;
  onUpdateSection: (id: string, sectionKey: string) => void;
  onUpdateSharing: (id: string, shared: boolean) => void;
  onReExtract: (id: string) => void;
  onRefresh: () => void;
  isAcceptPending: boolean;
  isRejectPending: boolean;
  isDeletePending: boolean;
  isReExtractPending?: boolean;
}

function ExtractionBadge({ status }: { status: string | null }) {
  switch (status) {
    case 'completed':
      return <Badge variant="outline" className="text-xs gap-1"><CheckCircle className="h-3 w-3 text-emerald-500" />Extracted</Badge>;
    case 'processing':
      return <Badge variant="outline" className="text-xs gap-1 text-amber-600"><Clock className="h-3 w-3 animate-spin" />Extracting...</Badge>;
    case 'failed':
      return <Badge variant="outline" className="text-xs gap-1 text-destructive"><XCircle className="h-3 w-3" />Failed</Badge>;
    default:
      return <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>;
  }
}

function ExtractionStatusBanner({
  source, onReExtract, isReExtractPending,
}: { source: ContextSource; onReExtract: (id: string) => void; isReExtractPending: boolean }) {
  const status = source.extraction_status;
  const method = source.extraction_method ?? '';
  const isSparse = method === 'url_meta_only' || method === 'url_html_sparse';

  if (status === 'completed' && !isSparse) return null;

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs text-muted-foreground">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Content extraction in progress...</span>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 text-xs text-amber-700 border border-amber-200">
        <Clock className="h-4 w-4 shrink-0 animate-spin" />
        <span>Extracting... (this takes up to 30 seconds)</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-xs text-destructive border border-destructive/20">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <span>Extraction failed: {source.extraction_error || 'Unknown error'}</span>
        </div>
        <Button size="sm" variant="outline" className="h-6 text-xs shrink-0"
          onClick={() => onReExtract(source.id)} disabled={isReExtractPending}>
          <RefreshCw className="h-3 w-3 mr-1" />Retry
        </Button>
      </div>
    );
  }

  if (isSparse) {
    return (
      <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 text-xs text-amber-700 border border-amber-200">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Page requires JavaScript — only metadata captured. Consider adding this source's key facts
          manually to the digest.
        </span>
      </div>
    );
  }

  return null;
}

function tabLabel(label: string, hasContent: boolean): React.ReactNode {
  return (
    <span className="flex items-center gap-1">
      {label}
      {hasContent && <CheckCircle className="h-3 w-3 text-emerald-500" />}
    </span>
  );
}

export function SourceDetail({
  source, onAccept, onReject, onDelete,
  onUpdateSection, onUpdateSharing, onReExtract, onRefresh,
  isAcceptPending, isRejectPending, isDeletePending,
  isReExtractPending = false,
}: SourceDetailProps) {
  const isPending = source.extraction_status === 'pending' || source.extraction_status === 'processing';
  const extractionMethod = (source as unknown as Record<string, string | null>).extraction_method ?? '';
  const isSparse = extractionMethod === 'url_meta_only' || extractionMethod === 'url_html_sparse';

  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => onRefresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPending, onRefresh]);

  const hasSummary = !!source.extracted_summary;
  const hasFullText = !!source.extracted_text;
  const hasKeyData = !!source.extracted_key_data;
  const extractionDone = source.extraction_status === 'completed';

  const extractButton = (
    <Button size="sm" variant="outline" className="mt-2"
      onClick={() => onReExtract(source.id)} disabled={isReExtractPending || isPending}>
      <Download className="h-3 w-3 mr-1" />
      {isReExtractPending ? 'Extracting...' : 'Extract Content Now'}
    </Button>
  );

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{displayName(source)}</h3>
          {source.source_url && (
            <a href={source.source_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline truncate block">
              {source.source_url}
            </a>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ExtractionBadge status={source.extraction_status} />
            {source.access_status === 'paywall' && (
              <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                <Lock className="h-3 w-3" /> Paywall
              </Badge>
            )}
            {source.access_status === 'blocked' && (
              <Badge variant="outline" className="text-xs gap-1 text-destructive">
                <XCircle className="h-3 w-3" /> Blocked
              </Badge>
            )}
            {source.access_status === 'accessible' && (
              <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-300">
                <Globe className="h-3 w-3" /> Accessible
              </Badge>
            )}
            {source.resource_type && <Badge variant="outline" className="text-xs">{source.resource_type}</Badge>}
            <Badge variant="secondary" className="text-xs">
              {source.discovery_source === 'ai_suggested' ? '🤖 AI Discovered' : '📎 Manual'}
            </Badge>
          </div>
        </div>

        <ExtractionStatusBanner source={source} onReExtract={onReExtract} isReExtractPending={isReExtractPending} />

        {source.discovery_status === 'suggested' && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAccept(source.id)} disabled={isAcceptPending}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => onReject(source.id)} disabled={isRejectPending}>Reject</Button>
          </div>
        )}

        <Separator />

        <Tabs defaultValue="summary">
          <TabsList className="h-8">
            <TabsTrigger value="summary" className="text-xs h-7">{tabLabel('Summary', hasSummary)}</TabsTrigger>
            <TabsTrigger value="full_text" className="text-xs h-7">{tabLabel('Full Text', hasFullText)}</TabsTrigger>
            <TabsTrigger value="key_data" className="text-xs h-7">{tabLabel('Key Data', hasKeyData)}</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-2">
            {hasSummary ? (
              <p className="text-sm whitespace-pre-wrap">{source.extracted_summary}</p>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isPending ? 'Extraction in progress...' : 'Content not yet extracted.'}
                {!isPending && extractButton}
              </div>
            )}
          </TabsContent>

          <TabsContent value="full_text" className="mt-2">
            {hasFullText ? (
              <div>
                {isSparse && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-600 mb-2">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Only metadata was captured — page requires JavaScript rendering.</span>
                  </div>
                )}
                <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md max-h-[400px] overflow-y-auto">
                  {source.extracted_text}
                </pre>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {isPending ? 'Extraction in progress...' : (
                  source.extraction_status === 'failed'
                    ? `Extraction failed: ${source.extraction_error || 'Unknown error'}`
                    : 'No text extracted yet.'
                )}
                {!isPending && extractButton}
              </div>
            )}
          </TabsContent>

          <TabsContent value="key_data" className="mt-2">
            {hasKeyData ? (
              <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {JSON.stringify(source.extracted_key_data, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground flex items-start gap-1.5">
                {isPending ? (
                  <span>Extraction in progress...</span>
                ) : extractionDone ? (
                  <>
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>No structured data found in this source.</span>
                  </>
                ) : (
                  <div>
                    <span>No structured data extracted yet.</span>
                    {extractButton}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground shrink-0">Section:</span>
          <Select value={source.section_key} onValueChange={(v) => onUpdateSection(source.id, v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SECTION_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Share with solvers:</span>
          <Switch checked={source.shared_with_solver} onCheckedChange={(v) => onUpdateSharing(source.id, v)} />
        </div>

        <Button size="sm" variant="destructive" className="text-xs"
          onClick={() => onDelete(source)} disabled={isDeletePending}>
          <Trash2 className="h-3 w-3 mr-1" />Delete Source
        </Button>
      </div>
    </ScrollArea>
  );
}
