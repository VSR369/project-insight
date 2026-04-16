/**
 * AmbiguityFindingsPanel — Displays ambiguity detection findings with accept/dismiss.
 */

import React from 'react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check, X, Search, Info } from 'lucide-react';
import { SECTION_LABELS } from '@/lib/cogniblend/waveConfig';
import { useAmbiguityFindings, useUpdateFindingAcceptance } from '@/hooks/queries/useQualityFindings';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  challengeId: string;
}

export function AmbiguityFindingsPanel({ challengeId }: Props) {
  const { data: findings, isLoading } = useAmbiguityFindings(challengeId);
  const updateAcceptance = useUpdateFindingAcceptance();

  const count = findings?.length ?? 0;

  return (
    <Collapsible defaultOpen={count > 0}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-sm">Ambiguity Findings</span>
          <Badge variant="secondary" className="text-[10px]">{count} findings</Badge>
        </div>
        <ChevronDown className="h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 space-y-2">
        {isLoading && <Skeleton className="h-24" />}
        {!isLoading && count === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border border-dashed">
            <Info className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">No ambiguity patterns detected.</span>
          </div>
        )}
        {(findings ?? []).map((f) => (
          <div key={f.id} className="border rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{f.pattern_matched}</Badge>
                <span className="text-xs text-muted-foreground">
                  {SECTION_LABELS[f.section_key] ?? f.section_key}
                </span>
              </div>
              <div className="flex gap-1">
                {f.curator_accepted === null && (
                  <>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      title="Accept suggestion"
                      onClick={() => updateAcceptance.mutate({ table: 'ambiguity', id: f.id, accepted: true })}
                    >
                      <Check className="h-3 w-3 text-emerald-600" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      title="Dismiss"
                      onClick={() => updateAcceptance.mutate({ table: 'ambiguity', id: f.id, accepted: false })}
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </>
                )}
                {f.curator_accepted === true && <Badge variant="secondary" className="text-[10px]">Accepted</Badge>}
                {f.curator_accepted === false && <Badge variant="outline" className="text-[10px]">Dismissed</Badge>}
              </div>
            </div>
            <p className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">"{f.snippet}"</p>
            {f.suggested_replacement && (
              <p className="text-xs text-muted-foreground">💡 Suggestion: {f.suggested_replacement}</p>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
