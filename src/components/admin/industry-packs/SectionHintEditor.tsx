/**
 * SectionHintEditor — Collapsible accordion for editing section-specific hints.
 */

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';

const SECTION_KEYS = [
  'deliverables',
  'solver_expertise',
  'evaluation_criteria',
  'success_metrics_kpis',
  'reward_structure',
  'context_and_background',
  'data_resources_provided',
  'phase_schedule',
] as const;

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onChange([...value, input.trim()]);
      setInput('');
    }
  };
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-muted text-xs px-2 py-0.5 rounded">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">×</button>
          </span>
        ))}
      </div>
      <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} className="text-sm" />
    </div>
  );
}

interface Props {
  hints: Record<string, any>;
  onChange: (hints: Record<string, any>) => void;
}

export function SectionHintEditor({ hints, onChange }: Props) {
  const updateHint = (sectionKey: string, field: string, value: any) => {
    const current = hints[sectionKey] || {};
    onChange({ ...hints, [sectionKey]: { ...current, [field]: value } });
  };

  return (
    <div className="space-y-2">
      <Label className="font-medium text-base">Section Hints</Label>
      <p className="text-xs text-muted-foreground">Industry-specific guidance injected into AI prompts per section</p>

      {SECTION_KEYS.map(key => {
        const hint = hints[key] || {};
        const hasContent = hint.hint || hint.anti_patterns?.length || hint.example_good;
        return (
          <Collapsible key={key} className="border rounded-md">
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-medium hover:bg-muted/50">
              <ChevronRight className="h-3 w-3 transition-transform" />
              <span className="capitalize">{key.replace(/_/g, ' ')}</span>
              {hasContent && <span className="ml-auto text-xs text-primary">configured</span>}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-3">
              <div>
                <Label className="text-xs">Hint</Label>
                <Textarea value={hint.hint || ''} onChange={(e) => updateHint(key, 'hint', e.target.value)} rows={3} placeholder="Industry-specific guidance..." />
              </div>
              <div>
                <Label className="text-xs">Anti-Patterns</Label>
                <TagInput value={hint.anti_patterns || []} onChange={(v) => updateHint(key, 'anti_patterns', v)} placeholder="Add anti-pattern..." />
              </div>
              <div>
                <Label className="text-xs">Example (Good)</Label>
                <Textarea value={hint.example_good || ''} onChange={(e) => updateHint(key, 'example_good', e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Example (Poor)</Label>
                <Textarea value={hint.example_poor || ''} onChange={(e) => updateHint(key, 'example_poor', e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Must Include Criteria</Label>
                <TagInput value={hint.must_include_criteria || []} onChange={(v) => updateHint(key, 'must_include_criteria', v)} placeholder="Add criterion..." />
              </div>
              <div>
                <Label className="text-xs">Typical Certifications</Label>
                <TagInput value={hint.typical_certifications || []} onChange={(v) => updateHint(key, 'typical_certifications', v)} placeholder="Add certification..." />
              </div>
              <div>
                <Label className="text-xs">Typical Experience</Label>
                <Input value={hint.typical_experience || ''} onChange={(e) => updateHint(key, 'typical_experience', e.target.value)} placeholder="e.g. 5-8 years for POC" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
