/**
 * DiscoveryResourceTypeCard — Extracted card for editing a single resource type
 * within the DiscoveryDirectivesEditor. Keeps the parent under 300 lines.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, X } from 'lucide-react';
import type { ResourceTypeDirective } from './DiscoveryDirectivesEditor';

/* ── Mini Tag Input (local) ── */

function MiniTagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="text-[11px] gap-0.5 h-5">
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))}>
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="text-xs h-7"
        />
        <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={add} disabled={!input.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

/* ── Resource Type Card ── */

interface DiscoveryResourceTypeCardProps {
  rt: ResourceTypeDirective;
  onChange: (patch: Partial<ResourceTypeDirective>) => void;
  onRemove: () => void;
}

export function DiscoveryResourceTypeCard({ rt, onChange, onRemove }: DiscoveryResourceTypeCardProps) {
  return (
    <div className="border rounded p-3 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 flex-1">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Input
              value={rt.type}
              onChange={e => onChange({ type: e.target.value })}
              placeholder="e.g., industry_report, benchmark_data"
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              value={rt.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder="What this resource type provides"
              className="text-xs h-8"
            />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 mt-5" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Search Queries</Label>
        <p className="text-[10px] text-muted-foreground">
          Use {'{{domain}}'}, {'{{orgName}}'}, {'{{solution_type}}'} for dynamic substitution.
        </p>
        <MiniTagInput
          tags={rt.search_queries}
          onChange={sq => onChange({ search_queries: sq })}
          placeholder='e.g., {{domain}} industry benchmarks 2025'
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Preferred Sources</Label>
          <MiniTagInput
            tags={rt.preferred_sources}
            onChange={ps => onChange({ preferred_sources: ps })}
            placeholder="e.g., Gartner, McKinsey"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Avoid Sources</Label>
          <MiniTagInput
            tags={rt.avoid_sources}
            onChange={av => onChange({ avoid_sources: av })}
            placeholder="e.g., Wikipedia"
          />
        </div>
      </div>
    </div>
  );
}
