/**
 * IndustryPackEditor — Form for editing an industry knowledge pack.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SectionHintEditor } from './SectionHintEditor';

interface Props {
  pack: any;
  onSave: () => void;
  onClose: () => void;
}

const REGIONS = ['global', 'us', 'eu', 'india', 'uk', 'middle_east', 'singapore', 'australia'] as const;

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
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {value.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-muted text-xs px-2 py-0.5 rounded">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">×</button>
          </span>
        ))}
      </div>
      <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder || 'Type and press Enter'} className="text-sm" />
    </div>
  );
}

export function IndustryPackEditor({ pack, onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    industry_name: pack.industry_name || '',
    industry_overview: pack.industry_overview || '',
    technology_landscape: pack.technology_landscape || '',
    common_kpis: pack.common_kpis || [],
    common_frameworks: pack.common_frameworks || [],
    common_certifications: pack.common_certifications || [],
    preferred_analyst_sources: pack.preferred_analyst_sources || [],
    typical_budget_ranges: pack.typical_budget_ranges || { blueprint: '', poc: '', pilot: '' },
    typical_timelines: pack.typical_timelines || { blueprint: '', poc: '', pilot: '' },
    regulatory_landscape: pack.regulatory_landscape || {},
    section_hints: pack.section_hints || {},
  });

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const updateBudget = (tier: string, value: string) => {
    setForm(prev => ({ ...prev, typical_budget_ranges: { ...prev.typical_budget_ranges, [tier]: value } }));
  };

  const updateTimeline = (tier: string, value: string) => {
    setForm(prev => ({ ...prev, typical_timelines: { ...prev.typical_timelines, [tier]: value } }));
  };

  const updateRegulation = (region: string, values: string[]) => {
    setForm(prev => ({ ...prev, regulatory_landscape: { ...prev.regulatory_landscape, [region]: values } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('industry_knowledge_packs' as any)
        .update({
          industry_name: form.industry_name,
          industry_overview: form.industry_overview,
          technology_landscape: form.technology_landscape,
          common_kpis: form.common_kpis,
          common_frameworks: form.common_frameworks,
          common_certifications: form.common_certifications,
          preferred_analyst_sources: form.preferred_analyst_sources,
          typical_budget_ranges: form.typical_budget_ranges,
          typical_timelines: form.typical_timelines,
          regulatory_landscape: form.regulatory_landscape,
          section_hints: form.section_hints,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', pack.id);
      if (error) throw new Error(error.message);
      toast.success('Industry pack updated successfully');
      onSave();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <div>
          <Label>Industry Name</Label>
          <Input value={form.industry_name} onChange={(e) => updateField('industry_name', e.target.value)} />
        </div>
        <div>
          <Label>Industry Overview</Label>
          <Textarea value={form.industry_overview} onChange={(e) => updateField('industry_overview', e.target.value)} rows={4} />
        </div>
        <div>
          <Label>Technology Landscape</Label>
          <Textarea value={form.technology_landscape} onChange={(e) => updateField('technology_landscape', e.target.value)} rows={3} />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div><Label>Common KPIs</Label><TagInput value={form.common_kpis} onChange={(v) => updateField('common_kpis', v)} /></div>
        <div><Label>Common Frameworks</Label><TagInput value={form.common_frameworks} onChange={(v) => updateField('common_frameworks', v)} /></div>
        <div><Label>Common Certifications</Label><TagInput value={form.common_certifications} onChange={(v) => updateField('common_certifications', v)} /></div>
        <div><Label>Preferred Analyst Sources</Label><TagInput value={form.preferred_analyst_sources} onChange={(v) => updateField('preferred_analyst_sources', v)} /></div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="font-medium">Budget Ranges</Label>
          {['blueprint', 'poc', 'pilot'].map(tier => (
            <div key={tier}><Label className="text-xs text-muted-foreground capitalize">{tier}</Label>
              <Input value={form.typical_budget_ranges[tier] || ''} onChange={(e) => updateBudget(tier, e.target.value)} placeholder="e.g. $10K-$50K" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label className="font-medium">Typical Timelines</Label>
          {['blueprint', 'poc', 'pilot'].map(tier => (
            <div key={tier}><Label className="text-xs text-muted-foreground capitalize">{tier}</Label>
              <Input value={form.typical_timelines[tier] || ''} onChange={(e) => updateTimeline(tier, e.target.value)} placeholder="e.g. 4-8 weeks" />
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="font-medium">Regulatory Landscape (per region)</Label>
        {REGIONS.map(region => (
          <Collapsible key={region}>
            <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary w-full text-left py-1">
              <ChevronRight className="h-3 w-3 transition-transform group-data-[state=open]:rotate-90" />
              <span className="capitalize">{region.replace('_', ' ')}</span>
              <span className="text-xs text-muted-foreground ml-auto">{(form.regulatory_landscape[region] || []).length} items</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 pb-2">
              <TagInput value={form.regulatory_landscape[region] || []} onChange={(v) => updateRegulation(region, v)} placeholder="Add regulation..." />
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <Separator />

      <SectionHintEditor hints={form.section_hints} onChange={(h) => updateField('section_hints', h)} />

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save
        </Button>
      </div>
    </div>
  );
}
