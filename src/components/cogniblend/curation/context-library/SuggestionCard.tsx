/**
 * SuggestionCard — Single AI-suggested source item with checkbox + inline accept/reject.
 * Bug 7 fix: Added inline Accept/Reject icon buttons.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Check, X } from 'lucide-react';
import { SECTION_LABELS, displayName, type ContextSource } from './types';

interface SuggestionCardProps {
  source: ContextSource;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-muted-foreground';
  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>;
}

export function SuggestionCard({ source, isSelected, isActive, onSelect, onToggleCheck, onAccept, onReject }: SuggestionCardProps) {
  return (
    <div
      className={`p-2 rounded-md cursor-pointer hover:bg-muted/50 border text-sm ${isActive ? 'bg-muted border-primary/30' : 'border-transparent'}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleCheck}
          onClick={e => e.stopPropagation()}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            <span className="truncate font-medium text-xs">{displayName(source)}</span>
            <ConfidenceBadge score={source.confidence_score} />
          </div>
          {source.relevance_explanation && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{source.relevance_explanation}</p>
          )}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px] h-4">{SECTION_LABELS[source.section_key] || source.section_key}</Badge>
            {source.resource_type && <Badge variant="outline" className="text-[10px] h-4">{source.resource_type}</Badge>}
          </div>
        </div>
        {/* Inline accept/reject buttons */}
        <div className="flex flex-col gap-0.5 shrink-0">
          {onAccept && (
            <Button
              size="icon" variant="ghost"
              className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              onClick={(e) => { e.stopPropagation(); onAccept(); }}
              title="Accept"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          {onReject && (
            <Button
              size="icon" variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              title="Reject"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
