/**
 * DiscoveryDirectivesEditor — Admin UI for managing discovery_directives JSONB
 * on ai_review_section_config rows. Controls per-section context discovery behaviour.
 */

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
import { Plus, Search, AlertTriangle } from 'lucide-react';
import { DiscoveryResourceTypeCard } from './DiscoveryResourceTypeCard';

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
                    <DiscoveryResourceTypeCard
                      rt={rt}
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
