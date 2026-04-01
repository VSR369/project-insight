/**
 * ResearchTab — Web search queries, industry frameworks, and analyst sources.
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, X } from 'lucide-react';
import type { WebSearchDirective } from '@/lib/cogniblend/assemblePrompt';
import { useState } from 'react';

import { DiscoveryDirectivesEditor, type DiscoveryDirectives } from './DiscoveryDirectivesEditor';

interface ResearchTabProps {
  webSearchQueries: WebSearchDirective[];
  industryFrameworks: string[];
  analystSources: string[];
  discoveryDirectives: DiscoveryDirectives | null;
  onQueriesChange: (q: WebSearchDirective[]) => void;
  onFrameworksChange: (f: string[]) => void;
  onSourcesChange: (s: string[]) => void;
  onDiscoveryDirectivesChange: (d: DiscoveryDirectives) => void;
}

function TagInput({
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
    if (v && !tags.includes(v)) {
      onChange([...tags, v]);
    }
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1">
            {tag}
            <button onClick={() => onChange(tags.filter(t => t !== tag))}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button variant="outline" size="sm" onClick={add} disabled={!input.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function ResearchTab({
  webSearchQueries,
  industryFrameworks,
  analystSources,
  discoveryDirectives,
  onQueriesChange,
  onFrameworksChange,
  onSourcesChange,
  onDiscoveryDirectivesChange,
}: ResearchTabProps) {
  const addQuery = () => {
    onQueriesChange([
      ...webSearchQueries,
      { purpose: '', queryTemplate: '', when: 'if_available' },
    ]);
  };

  const removeQuery = (idx: number) => {
    onQueriesChange(webSearchQueries.filter((_, i) => i !== idx));
  };

  const updateQuery = (idx: number, patch: Partial<WebSearchDirective>) => {
    onQueriesChange(webSearchQueries.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  };

  return (
    <div className="space-y-6">
      {/* Web Search Queries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Web Search Directives</h4>
            <p className="text-xs text-muted-foreground">
              Research queries the AI runs when generating content. Use {'{{domain}}'} for dynamic substitution.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addQuery}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {webSearchQueries.map((q, idx) => (
          <div key={idx} className="border rounded p-3 space-y-2 bg-card">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <Input
                value={q.purpose}
                onChange={e => updateQuery(idx, { purpose: e.target.value })}
                placeholder="Purpose"
                className="text-sm"
              />
              <Input
                value={q.queryTemplate}
                onChange={e => updateQuery(idx, { queryTemplate: e.target.value })}
                placeholder="Query template (e.g., {{domain}} benchmarks)"
                className="text-sm"
              />
              <div className="flex gap-2">
                <Select
                  value={q.when}
                  onValueChange={v => updateQuery(idx, { when: v as WebSearchDirective['when'] })}
                >
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always</SelectItem>
                    <SelectItem value="if_available">If Available</SelectItem>
                    <SelectItem value="for_generation_only">Generation Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeQuery(idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Industry Frameworks */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Industry Frameworks</Label>
        <p className="text-xs text-muted-foreground">Reference frameworks the AI should cite.</p>
        <TagInput
          tags={industryFrameworks}
          onChange={onFrameworksChange}
          placeholder="e.g., TOGAF, SAFe, Design Thinking"
        />
      </div>

      {/* Analyst Sources */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Analyst Sources</Label>
        <p className="text-xs text-muted-foreground">Sources the AI should reference.</p>
        <TagInput
          tags={analystSources}
          onChange={onSourcesChange}
          placeholder="e.g., Gartner, Forrester, McKinsey"
        />
      </div>
    </div>
  );
}
