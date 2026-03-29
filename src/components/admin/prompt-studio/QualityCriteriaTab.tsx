/**
 * QualityCriteriaTab — CRUD for quality criteria with severity + cross-reference picker.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { QualityCriterion } from '@/lib/cogniblend/assemblePrompt';
import { SECTION_KEYS, type SectionKey } from '@/types/sections';
import { getSectionDisplayName } from '@/lib/cogniblend/sectionDependencies';

interface QualityCriteriaTabProps {
  criteria: QualityCriterion[];
  onChange: (criteria: QualityCriterion[]) => void;
  currentSectionKey: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  warning: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  suggestion: 'bg-primary/10 text-primary border-primary/20',
};

export function QualityCriteriaTab({ criteria, onChange, currentSectionKey }: QualityCriteriaTabProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const otherSections = SECTION_KEYS.filter(k => k !== currentSectionKey);

  const addCriterion = () => {
    onChange([
      ...criteria,
      { name: '', description: '', severity: 'warning', crossReferences: [] },
    ]);
    setExpandedIdx(criteria.length);
  };

  const removeCriterion = (idx: number) => {
    onChange(criteria.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const updateCriterion = (idx: number, patch: Partial<QualityCriterion>) => {
    onChange(criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const toggleCrossRef = (idx: number, sectionKey: string) => {
    const c = criteria[idx];
    const refs = c.crossReferences ?? [];
    const next = refs.includes(sectionKey)
      ? refs.filter(r => r !== sectionKey)
      : [...refs, sectionKey];
    updateCriterion(idx, { crossReferences: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">Quality Criteria</h4>
          <p className="text-xs text-muted-foreground">
            Structured checks the AI evaluates. Each has a severity and optional cross-section references.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addCriterion}>
          <Plus className="h-4 w-4 mr-1" />
          Add Criterion
        </Button>
      </div>

      {criteria.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          No quality criteria defined. Add one to get started.
        </p>
      )}

      <div className="space-y-2">
        {criteria.map((c, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-3 space-y-3 bg-card"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 flex items-center gap-2">
                {expandedIdx === idx ? (
                  <Input
                    value={c.name}
                    onChange={e => updateCriterion(idx, { name: e.target.value })}
                    placeholder="Criterion name (e.g., MATURITY MATCH)"
                    className="font-medium text-sm"
                  />
                ) : (
                  <button
                    className="text-sm font-medium text-left flex-1 hover:text-primary transition-colors"
                    onClick={() => setExpandedIdx(idx)}
                  >
                    {c.name || '(unnamed)'}
                  </button>
                )}
                <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[c.severity] ?? ''}`}>
                  {c.severity}
                </Badge>
                {(c.crossReferences?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {c.crossReferences.length} ref{c.crossReferences.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeCriterion(idx)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>

            {expandedIdx === idx && (
              <div className="space-y-3 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={c.description}
                    onChange={e => updateCriterion(idx, { description: e.target.value })}
                    rows={2}
                    placeholder="What does this criterion check?"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Severity</Label>
                  <Select
                    value={c.severity}
                    onValueChange={v => updateCriterion(idx, { severity: v as QualityCriterion['severity'] })}
                  >
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cross-References (sections to check against)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {otherSections.map(sk => {
                      const isSelected = (c.crossReferences ?? []).includes(sk);
                      return (
                        <button
                          key={sk}
                          onClick={() => toggleCrossRef(idx, sk)}
                          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                            isSelected
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border'
                          }`}
                        >
                          {getSectionDisplayName(sk)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
