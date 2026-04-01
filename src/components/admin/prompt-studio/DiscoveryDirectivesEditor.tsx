/**
 * DiscoveryDirectivesEditor — Admin UI for managing discovery_directives JSONB
 * on ai_review_section_config rows. Controls per-section context discovery behaviour.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Trash2, X, Search, AlertTriangle } from 'lucide-react';

/* ── Types ── */

export interface ResourceTypeDirective {
  type: string;
  description: string;
  search_queries: string[];
  preferred_sources: string[];
  avoid_sources: string[];
}

export interface DiscoveryDirectives {
  skip_discovery: boolean;
  priority: 'high' | 'medium' | 'low';
  max_resources: number;
  discovery_context: string;
  resource_types: ResourceTypeDirective[];
}

const EMPTY_DIRECTIVES: DiscoveryDirectives = {
  skip_discovery: false,
  priority: 'medium',
  max_resources: 3,
  discovery_context: '',
  resource_types: [],
};

const EMPTY_RESOURCE_TYPE: ResourceTypeDirective = {
  type: '',
  description: '',
  search_queries: [],
  preferred_sources: [],
  avoid_sources: [],
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-muted text-muted-foreground',
};

/* ── Tag Input (local) ── */

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

/* ── Resource Type Editor ── */

function ResourceTypeEditor({
  rt,
  index,
  onChange,
  onRemove,
}: {
  rt: ResourceTypeDirective;
  index: number;
  onChange: (patch: Partial<ResourceTypeDirective>) => void;
  onRemove: () => void;
}) {
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

/* ── Main Component ── */

interface DiscoveryDirectivesEditorProps {
  value: DiscoveryDirectives | null;
  onChange: (d: DiscoveryDirectives) => void;
}

export function DiscoveryDirectivesEditor({ value, onChange }: DiscoveryDirectivesEditorProps) {
  const directives = value ?? EMPTY_DIRECTIVES;

  const update = (patch: Partial<DiscoveryDirectives>) => {
    onChange({ ...directives, ...patch });
  };

  const addResourceType = () => {
    update({ resource_types: [...directives.resource_types, { ...EMPTY_RESOURCE_TYPE }] });
  };

  const removeResourceType = (idx: number) => {
    update({ resource_types: directives.resource_types.filter((_, i) => i !== idx) });
  };

  const updateResourceType = (idx: number, patch: Partial<ResourceTypeDirective>) => {
    update({
      resource_types: directives.resource_types.map((rt, i) =>
        i === idx ? { ...rt, ...patch } : rt
      ),
    });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Context Discovery Directives</h4>
          <Badge variant="outline" className="text-[10px]">Phase 7</Badge>
        </div>
        <div className="flex items-center gap-2">
          {directives.skip_discovery && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" />
              Skipped
            </Badge>
          )}
          <Label className="text-xs">Skip</Label>
          <Switch
            checked={directives.skip_discovery}
            onCheckedChange={v => update({ skip_discovery: v })}
          />
        </div>
      </div>

      {!directives.skip_discovery && (
        <div className="space-y-4">
          {/* Priority + Max Resources */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Priority</Label>
              <Select
                value={directives.priority}
                onValueChange={v => update({ priority: v as DiscoveryDirectives['priority'] })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Resources</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={directives.max_resources}
                onChange={e => update({ max_resources: parseInt(e.target.value) || 3 })}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end">
              <Badge className={`text-[10px] ${PRIORITY_COLORS[directives.priority]}`}>
                {directives.priority} priority · max {directives.max_resources}
              </Badge>
            </div>
          </div>

          {/* Discovery Context */}
          <div className="space-y-1">
            <Label className="text-xs">Discovery Context</Label>
            <Textarea
              value={directives.discovery_context}
              onChange={e => update({ discovery_context: e.target.value })}
              placeholder="Additional context to guide resource discovery for this section..."
              className="text-xs h-16 resize-none"
            />
          </div>

          {/* Resource Types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Resource Types ({directives.resource_types.length})</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addResourceType}>
                <Plus className="h-3 w-3 mr-1" />
                Add Type
              </Button>
            </div>

            {directives.resource_types.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2">
                No resource types configured. Add types to define what context the AI should discover.
              </p>
            )}

            <Accordion type="multiple" className="space-y-1">
              {directives.resource_types.map((rt, idx) => (
                <AccordionItem key={idx} value={`rt-${idx}`} className="border-none">
                  <AccordionTrigger className="text-xs py-1.5 px-2 hover:no-underline bg-card rounded border">
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{rt.type || 'Untitled'}</Badge>
                      <span className="text-muted-foreground truncate max-w-[200px]">{rt.description}</span>
                      <Badge variant="secondary" className="text-[10px]">{rt.search_queries.length} queries</Badge>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-0">
                    <ResourceTypeEditor
                      rt={rt}
                      index={idx}
                      onChange={patch => updateResourceType(idx, patch)}
                      onRemove={() => removeResourceType(idx)}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      )}
    </div>
  );
}
