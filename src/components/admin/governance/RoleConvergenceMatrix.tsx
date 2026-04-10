/**
 * RoleConflictMatrix — 5x5 interactive matrix for role conflict rules.
 * Upper triangle is editable; lower mirrors it. Diagonal shows dashes.
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_PRIORITY, ROLE_DISPLAY } from '@/types/cogniRoles';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { handleMutationError, handleQueryError } from '@/lib/errorHandler';
import { countBlocks, deriveMinTeamSize } from '@/lib/roleConflictUtils';
import { toast } from 'sonner';
import type { GovernanceMode } from '@/lib/governanceMode';

interface RoleConflictMatrixProps {
  governanceMode: GovernanceMode;
}

interface ConflictRule {
  rule_id: number;
  role_a: string;
  role_b: string;
  conflict_type: string;
  governance_profile: string;
}

type ConflictMap = Record<string, Record<string, string>>;

function buildConflictMap(rules: ConflictRule[]): ConflictMap {
  const map: ConflictMap = {};
  for (const r of ROLE_PRIORITY) {
    map[r] = {};
    for (const c of ROLE_PRIORITY) {
      map[r][c] = 'ALLOWED';
    }
  }
  for (const rule of rules) {
    if (map[rule.role_a]) map[rule.role_a][rule.role_b] = rule.conflict_type;
    if (map[rule.role_b]) map[rule.role_b][rule.role_a] = rule.conflict_type;
  }
  return map;
}

export function RoleConflictMatrix({ governanceMode }: RoleConflictMatrixProps) {
  const queryClient = useQueryClient();
  const isQuick = governanceMode === 'QUICK';

  const { data: rules, isLoading, error } = useQuery<ConflictRule[]>({
    queryKey: ['role-conflict-rules', governanceMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_conflict_rules')
        .select('rule_id, role_a, role_b, conflict_type, governance_profile')
        .eq('governance_profile', governanceMode)
        .eq('is_active', true);
      if (error) {
        handleQueryError(error, { operation: 'fetch_role_conflict_rules' });
        return [];
      }
      return (data ?? []) as ConflictRule[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const [conflicts, setConflicts] = useState<ConflictMap>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (rules) setConflicts(buildConflictMap(rules));
  }, [rules]);

  const blockCount = useMemo(() => countBlocks(conflicts), [conflicts]);
  const minTeam = useMemo(() => deriveMinTeamSize(conflicts), [conflicts]);

  const toggleCell = (roleA: string, roleB: string) => {
    if (isQuick) return;
    setConflicts((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = { ...next[k] };
      const current = next[roleA][roleB];
      const newVal = current === 'HARD_BLOCK' ? 'ALLOWED' : 'HARD_BLOCK';
      next[roleA][roleB] = newVal;
      next[roleB][roleA] = newVal;
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Deactivate existing rules for this mode
      await supabase
        .from('role_conflict_rules')
        .update({ is_active: false })
        .eq('governance_profile', governanceMode);

      // Insert new HARD_BLOCK rules
      const inserts: Array<{ role_a: string; role_b: string; conflict_type: string; governance_profile: string; applies_scope: string; is_active: boolean }> = [];
      for (let i = 0; i < ROLE_PRIORITY.length; i++) {
        for (let j = i + 1; j < ROLE_PRIORITY.length; j++) {
          if (conflicts[ROLE_PRIORITY[i]]?.[ROLE_PRIORITY[j]] === 'HARD_BLOCK') {
            inserts.push({
              role_a: ROLE_PRIORITY[i],
              role_b: ROLE_PRIORITY[j],
              conflict_type: 'HARD_BLOCK',
              governance_profile: governanceMode,
              applies_scope: 'challenge',
              is_active: true,
            });
          }
        }
      }

      if (inserts.length > 0) {
        const { error: insertErr } = await supabase.from('role_conflict_rules').insert(inserts);
        if (insertErr) throw insertErr;
      }

      await queryClient.invalidateQueries({ queryKey: ['role-conflict-rules', governanceMode] });
      toast.success(`${governanceMode} conflict rules saved`);
    } catch (err) {
      handleMutationError(err, { operation: 'save_role_conflict_rules' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-[300px]" />;
  if (error) return <Alert variant="destructive"><AlertDescription>Failed to load conflict rules.</AlertDescription></Alert>;

  return (
    <div className="space-y-4">
      {isQuick && (
        <Alert>
          <AlertDescription>QUICK mode allows all role combinations. This matrix is read-only.</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Blocks: <strong className="text-foreground">{blockCount}</strong></span>
        <span>Min team: <strong className="text-foreground">{minTeam}</strong></span>
      </div>

      <div className="relative w-full overflow-auto">
        <table className="text-sm border-collapse">
          <thead>
            <tr>
              <th className="p-2" />
              {ROLE_PRIORITY.map((r) => (
                <th key={r} className="p-2 text-center font-medium text-xs">{r}<br /><span className="text-muted-foreground font-normal">{ROLE_DISPLAY[r]?.split(' ')[0]}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLE_PRIORITY.map((rowRole, ri) => (
              <tr key={rowRole}>
                <td className="p-2 font-medium text-xs">{rowRole}</td>
                {ROLE_PRIORITY.map((colRole, ci) => {
                  if (ri === ci) {
                    return <td key={colRole} className="p-2 text-center text-muted-foreground">—</td>;
                  }
                  const val = conflicts[rowRole]?.[colRole] ?? 'ALLOWED';
                  const isBlock = val === 'HARD_BLOCK';
                  const isUpper = ri < ci;
                  return (
                    <td key={colRole} className="p-2 text-center">
                      <button
                        type="button"
                        disabled={isQuick || !isUpper}
                        onClick={() => isUpper && toggleCell(rowRole, colRole)}
                        className={`w-10 h-10 rounded-md text-xs font-medium transition-colors ${
                          isBlock
                            ? 'bg-destructive/15 text-destructive border border-destructive/30'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        } ${isUpper && !isQuick ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-70'}`}
                      >
                        {isBlock ? '✕' : '✓'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isQuick && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Rules'}
          </Button>
        </div>
      )}
    </div>
  );
}
