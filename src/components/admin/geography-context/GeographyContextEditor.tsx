/**
 * GeographyContextEditor — Form for editing a geography context region.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  context: any;
  onSave: () => void;
  onClose: () => void;
}

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

export function GeographyContextEditor({ context, onSave, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    data_privacy_laws: context.data_privacy_laws || [],
    business_culture: context.business_culture || '',
    currency_context: context.currency_context || '',
    talent_market: context.talent_market || '',
    government_initiatives: context.government_initiatives || [],
    technology_maturity: context.technology_maturity || '',
    country_codes: context.country_codes || [],
  });

  const updateField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('geography_context' as any)
        .update({
          data_privacy_laws: form.data_privacy_laws,
          business_culture: form.business_culture,
          currency_context: form.currency_context,
          talent_market: form.talent_market,
          government_initiatives: form.government_initiatives,
          technology_maturity: form.technology_maturity,
          country_codes: form.country_codes,
        } as any)
        .eq('region_code', context.region_code);
      if (error) throw new Error(error.message);
      toast.success('Geography context updated successfully');
      onSave();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 py-4">
      <div>
        <Label>Region Name</Label>
        <Input value={context.region_name} disabled className="bg-muted" />
      </div>

      <div>
        <Label>Data Privacy Laws</Label>
        <TagInput value={form.data_privacy_laws} onChange={(v) => updateField('data_privacy_laws', v)} placeholder="Add privacy law..." />
      </div>

      <div>
        <Label>Business Culture</Label>
        <Textarea value={form.business_culture} onChange={(e) => updateField('business_culture', e.target.value)} rows={3} />
      </div>

      <div>
        <Label>Currency Context</Label>
        <Textarea value={form.currency_context} onChange={(e) => updateField('currency_context', e.target.value)} rows={2} />
      </div>

      <div>
        <Label>Talent Market</Label>
        <Textarea value={form.talent_market} onChange={(e) => updateField('talent_market', e.target.value)} rows={2} />
      </div>

      <div>
        <Label>Government Initiatives</Label>
        <TagInput value={form.government_initiatives} onChange={(v) => updateField('government_initiatives', v)} placeholder="Add initiative..." />
      </div>

      <div>
        <Label>Technology Maturity</Label>
        <Textarea value={form.technology_maturity} onChange={(e) => updateField('technology_maturity', e.target.value)} rows={2} />
      </div>

      <div>
        <Label>Country Codes</Label>
        <TagInput value={form.country_codes} onChange={(v) => updateField('country_codes', v)} placeholder="Add country code (e.g. IN, US)..." />
      </div>

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
