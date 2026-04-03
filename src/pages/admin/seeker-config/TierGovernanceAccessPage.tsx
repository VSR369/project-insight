/**
 * TierGovernanceAccessPage — Admin page for mapping subscription tiers to governance modes.
 * Route: /admin/seeker-config/tier-access
 */

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAllTierGovernanceAccess } from '@/hooks/queries/useTierGovernanceAccess';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { GovernanceMode } from '@/lib/governanceMode';

const TIERS = ['basic', 'standard', 'premium', 'enterprise'] as const;
const MODES: GovernanceMode[] = ['QUICK', 'STRUCTURED', 'CONTROLLED'];

interface TierRow {
  tier: string;
  modes: Record<GovernanceMode, boolean>;
  defaultMode: GovernanceMode;
}

export default function TierGovernanceAccessPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: accessRows, isLoading, error } = useAllTierGovernanceAccess();
  const [rows, setRows] = useState<TierRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!accessRows) return;
    const grouped: Record<string, TierRow> = {};
    for (const tier of TIERS) {
      grouped[tier] = { tier, modes: { QUICK: false, STRUCTURED: false, CONTROLLED: false }, defaultMode: 'QUICK' };
    }
    for (const row of accessRows) {
      const t = grouped[row.tier_code];
      if (!t) continue;
      t.modes[row.governance_mode as GovernanceMode] = true;
      if (row.is_default) t.defaultMode = row.governance_mode as GovernanceMode;
    }
    setRows(TIERS.map((t) => grouped[t]));
  }, [accessRows]);

  const toggleMode = (tierIdx: number, mode: GovernanceMode) => {
    setRows((prev) => prev.map((r, i) => {
      if (i !== tierIdx) return r;
      const newModes = { ...r.modes, [mode]: !r.modes[mode] };
      let newDefault = r.defaultMode;
      if (!newModes[newDefault]) {
        newDefault = MODES.find((m) => newModes[m]) ?? 'QUICK';
      }
      return { ...r, modes: newModes, defaultMode: newDefault };
    }));
  };

  const setDefault = (tierIdx: number, mode: GovernanceMode) => {
    setRows((prev) => prev.map((r, i) => i === tierIdx ? { ...r, defaultMode: mode } : r));
  };

  const handleSave = async () => {
    for (const row of rows) {
      const enabledModes = MODES.filter((m) => row.modes[m]);
      if (enabledModes.length === 0) {
        toast.error(`${row.tier}: at least one mode must be enabled`);
        return;
      }
      if (!row.modes[row.defaultMode]) {
        toast.error(`${row.tier}: default mode must be enabled`);
        return;
      }
    }

    setIsSaving(true);
    try {
      for (const row of rows) {
        for (const mode of MODES) {
          if (row.modes[mode]) {
            const payload = await withUpdatedBy({
              is_active: true,
              is_default: mode === row.defaultMode,
            });
            await supabase
              .from('md_tier_governance_access')
              .update(payload)
              .eq('tier_code', row.tier)
              .eq('governance_mode', mode);
          } else {
            const payload = await withUpdatedBy({ is_active: false, is_default: false });
            await supabase
              .from('md_tier_governance_access')
              .update(payload)
              .eq('tier_code', row.tier)
              .eq('governance_mode', mode);
          }
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['tier-governance-access'] });
      toast.success('Tier governance access updated successfully');
    } catch (err) {
      handleMutationError(err, { operation: 'update_tier_governance_access' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/seeker-config/governance-rules')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Tier Governance Access</h1>
          <p className="text-sm text-muted-foreground">
            Map subscription tiers to available governance modes and set defaults.
          </p>
        </div>
      </div>

      {isLoading && <Skeleton className="h-[300px]" />}
      {error && <Alert variant="destructive"><AlertDescription>Failed to load tier access data.</AlertDescription></Alert>}

      {!isLoading && rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tier → Mode Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium">Tier</th>
                    {MODES.map((m) => (
                      <th key={m} className="text-center py-2 px-4 font-medium">{m}</th>
                    ))}
                    <th className="text-center py-2 px-4 font-medium">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.tier} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium capitalize">{row.tier}</td>
                      {MODES.map((mode) => (
                        <td key={mode} className="text-center py-3 px-4">
                          <Checkbox checked={row.modes[mode]} onCheckedChange={() => toggleMode(idx, mode)} />
                        </td>
                      ))}
                      <td className="text-center py-3 px-4">
                        <div className="flex justify-center gap-2">
                          {MODES.filter((m) => row.modes[m]).map((m) => (
                            <Label key={m} className="flex items-center gap-1 cursor-pointer text-xs">
                              <input
                                type="radio"
                                name={`default-${row.tier}`}
                                checked={row.defaultMode === m}
                                onChange={() => setDefault(idx, m)}
                                className="h-3 w-3"
                              />
                              {m.slice(0, 3)}
                            </Label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pt-4 flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
