/**
 * DiagnosticsDiscoveryPanel — Context discovery pipeline status.
 * Reads from challenge_attachments + challenge_context_digest.
 */

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import type { DigestInfo } from '@/hooks/cogniblend/useDiagnosticsData';

interface AttachmentStats {
  acceptedLinks: number;
  acceptedDocs: number;
  excludedLinks: number;
  excludedDocs: number;
  totalSources: number;
  summaryGenerated: number;
  fullTextExtracted: number;
  partialText: number;
  keyDataExtracted: number;
  noKeyData: number;
  extractionNotReady: number;
  lowQualityFiltered: number;
  insufficientContent: number;
  usableForDigest: number;
}

interface Props {
  stats: AttachmentStats;
  digest: DigestInfo;
}

function StatusBadge({ ok, partial, label }: { ok: boolean; partial?: boolean; label: string }) {
  if (ok) return <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-400"><CheckCircle2 className="h-3.5 w-3.5" /> {label}</span>;
  if (partial) return <span className="inline-flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-400"><AlertTriangle className="h-3.5 w-3.5" /> {label}</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle className="h-3.5 w-3.5" /> {label}</span>;
}

function StepRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs font-medium text-muted-foreground w-32 shrink-0">{label}</span>
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  );
}

export function DiagnosticsDiscoveryPanel({ stats, digest }: Props) {
  const hasAnySources = stats.totalSources > 0;
  const totalAccepted = stats.acceptedLinks + stats.acceptedDocs;
  const allTextExtracted = stats.fullTextExtracted > 0 && stats.partialText === 0;
  const consolidated = !!digest.rawContextBlock;
  const hasFilterGap = totalAccepted > 0 && stats.usableForDigest < totalAccepted;

  const digestStatus = digest.exists
    ? (digest.sourceCount > 0 ? 'success' : 'partial')
    : 'failed';

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <span className="font-semibold text-sm">Context Discovery Pipeline</span>
        <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="border rounded-lg divide-y">
          {/* Step 1: Web Search */}
          <div className="p-3 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold">Step 1: Web Search</span>
              <StatusBadge ok={hasAnySources} label={hasAnySources ? 'Success' : 'No Sources'} />
            </div>
            <StepRow label="Accepted Links"><span className="text-xs">{stats.acceptedLinks}</span></StepRow>
            <StepRow label="Accepted Documents"><span className="text-xs">{stats.acceptedDocs}</span></StepRow>
            <StepRow label="Excluded Links"><span className="text-xs">{stats.excludedLinks}</span></StepRow>
            <StepRow label="Excluded Documents"><span className="text-xs">{stats.excludedDocs}</span></StepRow>
          </div>

          {/* Step 2: Extraction */}
          <div className="p-3 space-y-1">
            <span className="text-xs font-semibold block mb-2">Step 2: Extraction Summary</span>
            <StepRow label="Summary Generated">
              <StatusBadge ok={stats.summaryGenerated > 0} label={stats.summaryGenerated > 0 ? `Yes (${stats.summaryGenerated} sources)` : 'No'} />
            </StepRow>
            <StepRow label="Full Text Extracted">
              <StatusBadge
                ok={allTextExtracted}
                partial={stats.partialText > 0}
                label={allTextExtracted ? `Yes (${stats.fullTextExtracted} sources)` : stats.partialText > 0 ? `Partial (${stats.fullTextExtracted} of ${stats.fullTextExtracted + stats.partialText})` : 'No'}
              />
            </StepRow>
            <StepRow label="Key Data Extracted">
              <StatusBadge ok={stats.keyDataExtracted > 0} label={stats.keyDataExtracted > 0 ? `Yes (${stats.keyDataExtracted})` : 'No'} />
            </StepRow>
          </div>

          {/* Step 3: Consolidation */}
          <div className="p-3 space-y-1">
            <span className="text-xs font-semibold block mb-2">Step 3: Consolidation</span>
            <StepRow label="Total Accepted">
              <span className="text-xs font-medium">{totalAccepted}</span>
            </StepRow>
            <StepRow label="Usable for Digest">
              <span className="text-xs font-medium">{stats.usableForDigest}</span>
            </StepRow>
            {hasFilterGap && (
              <div className="ml-[140px] mt-1 space-y-1">
                <div className="flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[10px] text-muted-foreground">
                    {totalAccepted - stats.usableForDigest} source(s) filtered before digest:
                  </span>
                </div>
                <ul className="text-[10px] text-muted-foreground list-disc ml-5 space-y-0.5">
                  {stats.extractionNotReady > 0 && (
                    <li>{stats.extractionNotReady} — extraction pending/failed</li>
                  )}
                  {stats.lowQualityFiltered > 0 && (
                    <li>{stats.lowQualityFiltered} — low/seed quality</li>
                  )}
                  {stats.insufficientContent > 0 && (
                    <li>{stats.insufficientContent} — insufficient content (&lt;200 chars text, &lt;50 chars summary)</li>
                  )}
                </ul>
              </div>
            )}
            <StepRow label="Source Text Consolidated">
              <StatusBadge ok={consolidated} label={consolidated ? 'Yes' : 'No'} />
            </StepRow>
          </div>

          {/* Step 4: Context Digest */}
          <div className="p-3 space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold">Step 4: Context Digest</span>
              <StatusBadge
                ok={digestStatus === 'success'}
                partial={digestStatus === 'partial'}
                label={digestStatus === 'success' ? 'Success' : digestStatus === 'partial' ? 'Partial' : 'Not Generated'}
              />
            </div>
            <StepRow label="Source Count"><span className="text-xs">{digest.sourceCount}</span></StepRow>
            <StepRow label="Curator Edited">
              <StatusBadge ok={digest.curatorEdited} label={digest.curatorEdited ? 'Yes' : 'No'} />
            </StepRow>
            <StepRow label="Ready for Generate">
              <StatusBadge ok={digest.exists && consolidated} label={digest.exists && consolidated ? 'Yes' : 'No'} />
            </StepRow>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
