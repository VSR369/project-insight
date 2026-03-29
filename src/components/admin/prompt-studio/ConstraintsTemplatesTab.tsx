/**
 * ConstraintsTemplatesTab — Master data constraints, computation rules, and content templates.
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import type { MasterDataConstraint, ContentTemplates } from '@/lib/cogniblend/assemblePrompt';

interface ConstraintsTemplatesTabProps {
  constraints: MasterDataConstraint[];
  computationRules: string[];
  contentTemplates: ContentTemplates;
  onConstraintsChange: (c: MasterDataConstraint[]) => void;
  onRulesChange: (r: string[]) => void;
  onTemplatesChange: (t: ContentTemplates) => void;
}

export function ConstraintsTemplatesTab({
  constraints,
  computationRules,
  contentTemplates,
  onConstraintsChange,
  onRulesChange,
  onTemplatesChange,
}: ConstraintsTemplatesTabProps) {
  const addConstraint = () => {
    onConstraintsChange([
      ...constraints,
      { fieldName: '', validValuesSource: '', enforceStrictly: true },
    ]);
  };

  const removeConstraint = (idx: number) => {
    onConstraintsChange(constraints.filter((_, i) => i !== idx));
  };

  const updateConstraint = (idx: number, patch: Partial<MasterDataConstraint>) => {
    onConstraintsChange(constraints.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const addRule = () => onRulesChange([...computationRules, '']);
  const removeRule = (idx: number) => onRulesChange(computationRules.filter((_, i) => i !== idx));
  const updateRule = (idx: number, value: string) =>
    onRulesChange(computationRules.map((r, i) => (i === idx ? value : r)));

  return (
    <div className="space-y-6">
      {/* Master Data Constraints */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Master Data Constraints</h4>
            <p className="text-xs text-muted-foreground">
              Fields that must come from lookup tables.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addConstraint}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {constraints.map((c, idx) => (
          <div key={idx} className="flex items-center gap-2 border rounded p-2 bg-card">
            <Input
              value={c.fieldName}
              onChange={e => updateConstraint(idx, { fieldName: e.target.value })}
              placeholder="Field name"
              className="text-sm flex-1"
            />
            <Input
              value={c.validValuesSource}
              onChange={e => updateConstraint(idx, { validValuesSource: e.target.value })}
              placeholder="Source table"
              className="text-sm flex-1"
            />
            <div className="flex items-center gap-1">
              <Switch
                checked={c.enforceStrictly}
                onCheckedChange={v => updateConstraint(idx, { enforceStrictly: v })}
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Strict</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeConstraint(idx)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Computation Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Computation Rules</h4>
            <p className="text-xs text-muted-foreground">
              Programmatic rules the AI must follow.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={addRule}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {computationRules.map((rule, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={rule}
              onChange={e => updateRule(idx, e.target.value)}
              placeholder="e.g., Weights must total exactly 100%"
              className="text-sm"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeRule(idx)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* Content Templates */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Content Templates (per maturity)</h4>
        <p className="text-xs text-muted-foreground">
          Output structure guidance per maturity level.
        </p>
        {['blueprint', 'poc', 'pilot'].map(level => (
          <div key={level} className="space-y-1">
            <Label className="text-xs capitalize">{level}</Label>
            <Textarea
              value={contentTemplates?.[level] ?? ''}
              onChange={e =>
                onTemplatesChange({ ...contentTemplates, [level]: e.target.value })
              }
              rows={3}
              placeholder={`Template for ${level} maturity...`}
              className="text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
