/**
 * SuggestionCard — Single AI-suggested source item with checkbox.
 * < 80 lines per plan spec.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles } from 'lucide-react';
import { SECTION_LABELS, displayName, type ContextSource } from './types';

interface SuggestionCardProps {
  source: ContextSource;
  isSelected: boolean;
  isActive: boolean;
  onSelect: () => void;
  onToggleCheck: () => void;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-muted-foreground';
  return <span className={`text-xs font-medium ${color}`}>{pct}%</span>;
}

export function SuggestionCard({ source, isSelected, isActive, onSelect, onToggleCheck }: SuggestionCardProps) {
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
      </div>
    </div>
  );
}
