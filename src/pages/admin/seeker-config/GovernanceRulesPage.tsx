/**
 * GovernanceRulesPage — Admin page for Supervisors to configure
 * per-field, per-mode visibility and validation rules for the
 * challenge creation wizard.
 *
 * Route: /admin/seeker-config/governance-rules
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { CACHE_STABLE } from '@/config/queryCache';
import type { GovernanceMode } from '@/lib/governanceMode';
import { GOVERNANCE_MODE_CONFIG } from '@/lib/governanceMode';

import { PageHeader } from '@/components/admin/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, RefreshCw } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────── */

interface FieldRuleRow {
  id: string;
  governance_mode: string;
  field_key: string;
  wizard_step: number;
  visibility: string;
  min_length: number | null;
  max_length: number | null;
  default_value: string | null;
  display_order: number;
  is_active: boolean;
}

type EditableFields = Pick<FieldRuleRow, 'visibility' | 'min_length' | 'max_length'>;

const STEP_LABELS: Record<number, string> = {
  1: 'Challenge Brief',
  2: 'Evaluation',
  3: 'Rewards & Payment',
  4: 'Timeline',
  5: 'Provider Eligibility',
  6: 'Templates',
};

const VISIBILITY_OPTIONS = [
  { value: 'required', label: 'Required', color: 'bg-destructive/10 text-destructive' },
  { value: 'optional', label: 'Optional', color: 'bg-muted text-muted-foreground' },
  { value: 'hidden', label: 'Hidden', color: 'bg-secondary text-secondary-foreground' },
  { value: 'auto', label: 'Auto', color: 'bg-primary/10 text-primary' },
  { value: 'ai_drafted', label: 'AI Drafted', color: 'bg-accent text-accent-foreground' },
];

/* ── Hook: fetch all rules ──────────────────────────────── */

function useAllGovernanceRules() {
  return useQuery({
    queryKey: ['admin-governance-field-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_governance_field_rules')
        .select('*')
        .order('governance_mode')
        .order('wizard_step')
        .order('display_order');

      if (error) throw new Error(error.message);
      return data as FieldRuleRow[];
    },
    ...CACHE_STABLE,
  });
}

/* ── Component ──────────────────────────────────────────── */

export default function GovernanceRulesPage() {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useAllGovernanceRules();
  const [activeTab, setActiveTab] = useState<GovernanceMode>('QUICK');
  const [edits, setEdits] = useState<Record<string, Partial<EditableFields>>>({});

  const hasEdits = Object.keys(edits).length > 0;

  // Group rules by mode
  const rulesByMode = useMemo(() => {
    if (!rules) return {} as Record<GovernanceMode, FieldRuleRow[]>;
    const grouped: Record<string, FieldRuleRow[]> = {};
    for (const r of rules) {
      if (!grouped[r.governance_mode]) grouped[r.governance_mode] = [];
      grouped[r.governance_mode].push(r);
    }
    return grouped as Record<GovernanceMode, FieldRuleRow[]>;
  }, [rules]);

  const currentRules = rulesByMode[activeTab] ?? [];

  // Track edits
  const handleEdit = useCallback((ruleId: string, field: keyof EditableFields, value: string | number | null) => {
    setEdits((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], [field]: value },
    }));
  }, []);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(edits);
      for (const [ruleId, changes] of entries) {
        const withAudit = await withUpdatedBy({
          ...changes,
          updated_at: new Date().toISOString(),
        });
        const { error } = await supabase
          .from('md_governance_field_rules')
          .update(withAudit as any)
          .eq('id', ruleId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['admin-governance-field-rules'] });
      queryClient.invalidateQueries({ queryKey: ['governance-field-rules'] });
      toast.success(`${Object.keys(edits).length} rule(s) updated successfully`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_governance_rules' });
    },
  });

  // Get effective value (edited or original)
  const getEffective = (rule: FieldRuleRow, field: keyof EditableFields) => {
    return edits[rule.id]?.[field] ?? rule[field];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Governance Field Rules"
        description="Configure which fields are required, optional, hidden, auto-populated, or AI-drafted for each governance mode."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GovernanceMode)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            {(['QUICK', 'STRUCTURED', 'CONTROLLED'] as GovernanceMode[]).map((m) => (
              <TabsTrigger key={m} value={m} className="gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: GOVERNANCE_MODE_CONFIG[m].color }}
                />
                {GOVERNANCE_MODE_CONFIG[m].label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex items-center gap-2">
            {hasEdits && (
              <Badge variant="secondary" className="text-xs">
                {Object.keys(edits).length} unsaved change(s)
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEdits({})}
              disabled={!hasEdits}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={!hasEdits || saveMutation.isPending}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {(['QUICK', 'STRUCTURED', 'CONTROLLED'] as GovernanceMode[]).map((m) => (
          <TabsContent key={m} value={m}>
            <div className="rounded-lg border bg-card">
              <div className="relative w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead className="w-[160px]">Visibility</TableHead>
                      <TableHead className="w-[100px]">Min Length</TableHead>
                      <TableHead className="w-[100px]">Max Length</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No rules configured for {m} mode. Contact system administrator.
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentRules.map((rule, idx) => {
                        const effectiveVis = getEffective(rule, 'visibility') as string;
                        const visOption = VISIBILITY_OPTIONS.find((v) => v.value === effectiveVis);
                        const isEdited = !!edits[rule.id];

                        return (
                          <TableRow key={rule.id} className={isEdited ? 'bg-primary/5' : ''}>
                            <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {STEP_LABELS[rule.wizard_step] ?? `Step ${rule.wizard_step}`}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{rule.field_key}</TableCell>
                            <TableCell>
                              <Select
                                value={effectiveVis}
                                onValueChange={(v) => handleEdit(rule.id, 'visibility', v)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {VISIBILITY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${opt.color}`}>
                                        {opt.label}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 w-20 text-xs"
                                value={(getEffective(rule, 'min_length') as number | null) ?? ''}
                                onChange={(e) =>
                                  handleEdit(rule.id, 'min_length', e.target.value ? Number(e.target.value) : null)
                                }
                                placeholder="—"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                className="h-8 w-20 text-xs"
                                value={(getEffective(rule, 'max_length') as number | null) ?? ''}
                                onChange={(e) =>
                                  handleEdit(rule.id, 'max_length', e.target.value ? Number(e.target.value) : null)
                                }
                                placeholder="—"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
