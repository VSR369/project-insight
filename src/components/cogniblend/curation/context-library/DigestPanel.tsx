/**
 * DigestPanel — Collapsible context digest at bottom of the drawer.
 * < 100 lines per plan spec.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, ChevronDown, BookOpen } from 'lucide-react';

interface DigestData {
  digest_text: string | null;
  source_count: number;
  key_facts?: unknown;
}

interface DigestPanelProps {
  digest: DigestData | null | undefined;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export function DigestPanel({ digest, onRegenerate, isRegenerating }: DigestPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="shrink-0 border-t">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50">
          <span className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Context Digest
            {digest?.source_count != null && (
              <Badge variant="secondary" className="text-xs">{digest.source_count} sources</Badge>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm" variant="ghost" className="h-6 text-xs"
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              disabled={isRegenerating}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRegenerating ? 'animate-spin' : ''}`} />
              {isRegenerating ? 'Generating...' : 'Regenerate'}
            </Button>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ScrollArea className="max-h-[200px]">
            <div className="px-3 pb-3">
              {digest?.digest_text ? (
                <p className="text-xs whitespace-pre-wrap text-muted-foreground">{digest.digest_text}</p>
              ) : (
                <p className="text-xs text-muted-foreground">No digest generated yet. Add sources and click "Regenerate".</p>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
