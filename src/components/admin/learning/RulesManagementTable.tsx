/**
 * RulesManagementTable — Editable table for learning rules with promote/merge/toggle.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Edit3, ArrowUp, Merge, ToggleLeft, ToggleRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLearningRules, useUpdateLearningRule, useMergeLearningRules } from '@/hooks/queries/useLearningRules';
import type { LearningRuleRow } from '@/hooks/queries/useLearningRules';

export function RulesManagementTable() {
  const { data: rules, isLoading } = useLearningRules();
  const updateRule = useUpdateLearningRule();
  const mergeRules = useMergeLearningRules();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-64" />;

  const startEdit = (rule: LearningRuleRow) => {
    setEditingId(rule.id);
    setEditText(rule.learning_rule);
  };

  const saveEdit = (id: string) => {
    updateRule.mutate({ id, updates: { learning_rule: editText } });
    setEditingId(null);
  };

  const promote = (id: string) => {
    updateRule.mutate({ id, updates: { activation_confidence: 0.85, is_active: true } });
  };

  const toggleActive = (rule: LearningRuleRow) => {
    updateRule.mutate({ id: rule.id, updates: { is_active: !rule.is_active } });
  };

  const handleMerge = (keepId: string, removeId: string) => {
    mergeRules.mutate({ keepId, removeId });
    setMergeTarget(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Learning Rules ({rules?.length ?? 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-muted-foreground">Rule</th>
                <th className="pb-2 font-medium text-muted-foreground w-24">Class</th>
                <th className="pb-2 font-medium text-muted-foreground w-20">Conf.</th>
                <th className="pb-2 font-medium text-muted-foreground w-16">Curators</th>
                <th className="pb-2 font-medium text-muted-foreground w-16">Status</th>
                <th className="pb-2 font-medium text-muted-foreground w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rules ?? []).map((rule) => (
                <tr key={rule.id} className="border-b last:border-0">
                  <td className="py-2 pr-2">
                    {editingId === rule.id ? (
                      <div className="flex gap-1 items-start">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[60px] text-xs"
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => saveEdit(rule.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="font-medium">{rule.section_key.replace(/_/g, ' ')}</span>
                        <p className="mt-0.5 text-muted-foreground">{rule.learning_rule}</p>
                      </div>
                    )}
                  </td>
                  <td className="py-2">
                    <Badge variant="outline" className="text-[10px]">
                      {rule.correction_class ?? '—'}
                    </Badge>
                  </td>
                  <td className="py-2 font-mono text-xs">
                    {rule.activation_confidence.toFixed(2)}
                  </td>
                  <td className="py-2 font-mono text-xs text-center">
                    {rule.distinct_curator_count}
                  </td>
                  <td className="py-2">
                    <Badge variant={rule.is_active ? 'secondary' : 'outline'} className="text-[10px]">
                      {rule.is_active ? 'Active' : 'Dormant'}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => startEdit(rule)}>
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      {!rule.is_active && rule.activation_confidence < 0.7 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Promote to active" onClick={() => promote(rule.id)}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={rule.is_active ? 'Deactivate' : 'Activate'} onClick={() => toggleActive(rule)}>
                        {rule.is_active ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                      </Button>
                      {mergeTarget && mergeTarget !== rule.id ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Merge into this rule" onClick={() => handleMerge(rule.id, mergeTarget)}>
                          <Check className="h-3 w-3 text-emerald-600" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Select as merge source" onClick={() => setMergeTarget(mergeTarget === rule.id ? null : rule.id)}>
                          <Merge className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(rules ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No learning rules extracted yet. Run &quot;Extract Patterns&quot; after curator corrections accumulate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
