/**
 * SourceDetail — Right panel showing detail tabs for a selected source.
 * Includes polling for pending extraction, re-extract action, and content indicators.
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
import { Trash2, CheckCircle, Clock, XCircle, RefreshCw, Download } from 'lucide-react';
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
  onUpdateSection, onUpdateSharing,
  onReExtract, onRefresh,
  isAcceptPending, isRejectPending, isDeletePending,
  isReExtractPending = false,
}: SourceDetailProps) {
  const isPending = source.extraction_status === 'pending' || source.extraction_status === 'processing';

  // Poll for extraction completion
  useEffect(() => {
    if (!isPending) return;
    const interval = setInterval(() => onRefresh(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPending, onRefresh]);

  const hasSummary = !!source.extracted_summary;
  const hasFullText = !!source.extracted_text;
  const hasKeyData = !!source.extracted_key_data;

  const emptyAction = (
    <Button
      size="sm" variant="outline" className="mt-2"
      onClick={() => onReExtract(source.id)}
      disabled={isReExtractPending || isPending}
    >
      <Download className="h-3 w-3 mr-1" />
      {isReExtractPending ? 'Extracting...' : 'Extract Content Now'}
    </Button>
  );

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-sm font-semibold">{displayName(source)}</h3>
          {source.source_url && (
            <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">
              {source.source_url}
            </a>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ExtractionBadge status={source.extraction_status} />
            {source.resource_type && <Badge variant="outline" className="text-xs">{source.resource_type}</Badge>}
            <Badge variant="secondary" className="text-xs">
              {source.discovery_source === 'ai_suggested' ? '🤖 AI Discovered' : '📎 Manual'}
            </Badge>
            {source.extraction_status === 'failed' && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onReExtract(source.id)} disabled={isReExtractPending}>
                <RefreshCw className="h-3 w-3 mr-1" />Retry
              </Button>
            )}
          </div>
          {source.extraction_error && (
            <p className="text-xs text-destructive mt-1">{source.extraction_error}</p>
          )}
        </div>

        {/* Suggestion actions */}
        {source.discovery_status === 'suggested' && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onAccept(source.id)} disabled={isAcceptPending}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => onReject(source.id)} disabled={isRejectPending}>Reject</Button>
          </div>
        )}

        <Separator />

        {/* Content tabs */}
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
              <div>
                <p className="text-sm text-muted-foreground">{isPending ? 'Extraction in progress...' : 'No summary available yet.'}</p>
                {!isPending && emptyAction}
              </div>
            )}
          </TabsContent>
          <TabsContent value="full_text" className="mt-2">
            {hasFullText ? (
              <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md max-h-[400px] overflow-y-auto">
                {source.extracted_text}
              </pre>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">{isPending ? 'Extraction in progress...' : 'No text extracted yet.'}</p>
                {!isPending && emptyAction}
              </div>
            )}
          </TabsContent>
          <TabsContent value="key_data" className="mt-2">
            {hasKeyData ? (
              <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                {JSON.stringify(source.extracted_key_data, null, 2)}
              </pre>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">{isPending ? 'Extraction in progress...' : 'No structured data extracted yet.'}</p>
                {!isPending && emptyAction}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Section linkage */}
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

        {/* Sharing toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Share with solvers:</span>
          <Switch checked={source.shared_with_solver} onCheckedChange={(v) => onUpdateSharing(source.id, v)} />
        </div>

        {/* Delete */}
        <Button
          size="sm" variant="destructive" className="text-xs"
          onClick={() => onDelete(source)}
          disabled={isDeletePending}
        >
          <Trash2 className="h-3 w-3 mr-1" />Delete Source
        </Button>
      </div>
    </ScrollArea>
  );
}
