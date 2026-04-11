/**
 * SuggestionCard — AI-suggested source with inline accept/reject actions.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SECTION_LABELS, displayName, type ContextSource } from './types';

interface SuggestionCardProps {
  source: ContextSource;
  isActive: boolean;
  onSelect: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isAcceptPending?: boolean;
  isRejectPending?: boolean;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color =
    pct >= 85
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : pct >= 70
        ? 'text-amber-600 bg-amber-50 border-amber-200'
        : 'text-muted-foreground bg-muted border-border';
  return (
    <Badge variant="outline" className={cn('text-[10px] px-1 h-4 font-medium', color)}>
      {pct}%
    </Badge>
  );
}

export function SuggestionCard({
  source, isActive, onSelect, onAccept, onReject,
  isAcceptPending, isRejectPending,
}: SuggestionCardProps) {
  return (
    <div
      className={cn(
        'p-2 rounded-md cursor-pointer hover:bg-muted/50 border text-sm',
        isActive ? 'bg-muted border-primary/30' : 'border-transparent',
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="truncate font-medium text-xs">{displayName(source)}</span>
            <ConfidenceBadge score={source.confidence_score} />
          </div>
          {source.relevance_explanation && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {source.relevance_explanation}
            </p>
          )}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px] h-4">
              {SECTION_LABELS[source.section_key] || source.section_key}
            </Badge>
            {source.resource_type && (
              <Badge variant="outline" className="text-[10px] h-4">{source.resource_type}</Badge>
            )}
          </div>
        </div>

        {/* Inline action buttons */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          {source.source_url && (
            <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" asChild>
              <a href={source.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
          <Button
            size="icon" variant="ghost"
            className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            onClick={() => onAccept(source.id)}
            disabled={isAcceptPending}
            title="Accept source"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon" variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onReject(source.id)}
            disabled={isRejectPending}
            title="Reject source"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
