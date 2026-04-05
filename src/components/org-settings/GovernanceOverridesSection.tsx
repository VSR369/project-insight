/**
 * GovernanceOverridesSection — Per-mode overrides for org governance config.
 */

import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useOrgGovernanceOverrides, useUpsertOrgGovernanceOverride } from '@/hooks/queries/useOrgGovernanceOverrides';
import type { GovernanceMode } from '@/lib/governanceMode';

interface GovernanceOverridesSectionProps { organizationId: string; }

const MODES: GovernanceMode[] = ['QUICK', 'STRUCTURED', 'CONTROLLED'];

export function GovernanceOverridesSection({ organizationId }: GovernanceOverridesSectionProps) {
  const { data: overrides, isLoading } = useOrgGovernanceOverrides(organizationId);
  const upsertMut = useUpsertOrgGovernanceOverride();

  const [editMode, setEditMode] = useState<GovernanceMode | null>(null);
  const [threshold, setThreshold] = useState('');
  const [escrowPct, setEscrowPct] = useState('');
  const [checklist, setChecklist] = useState('');

  const startEdit = (mode: GovernanceMode) => {
    const existing = overrides?.find((o) => o.governance_mode === mode);
    setEditMode(mode);
    setThreshold(existing?.legal_review_threshold_override?.toString() ?? '');
    setEscrowPct(existing?.escrow_deposit_pct_override?.toString() ?? '');
    setChecklist(existing?.curation_checklist_override?.toString() ?? '');
  };

  const handleSave = () => {
    if (!editMode) return;
    upsertMut.mutate({
      organization_id: organizationId,
      governance_mode: editMode,
      legal_review_threshold_override: threshold ? Number(threshold) : null,
      escrow_deposit_pct_override: escrowPct ? Number(escrowPct) : null,
      curation_checklist_override: checklist ? Number(checklist) : null,
    }, { onSuccess: () => setEditMode(null) });
  };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />Organization Overrides
        </CardTitle>
        <CardDescription className="text-xs">
          Override platform-level governance defaults for your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {MODES.map((mode) => {
          const existing = overrides?.find((o) => o.governance_mode === mode);
          const isEditing = editMode === mode;

          return (
            <div key={mode} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{mode}</Badge>
                {!isEditing && (
                  <Button size="sm" variant="ghost" onClick={() => startEdit(mode)}>
                    {existing ? 'Edit' : 'Set Override'}
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Legal Threshold</Label>
                      <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} placeholder="50000" className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Escrow %</Label>
                      <Input type="number" value={escrowPct} onChange={(e) => setEscrowPct(e.target.value)} placeholder="80" className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Checklist Items</Label>
                      <Input type="number" value={checklist} onChange={(e) => setChecklist(e.target.value)} placeholder="14" className="text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} disabled={upsertMut.isPending}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditMode(null)}>Cancel</Button>
                  </div>
                </div>
              ) : existing ? (
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Threshold: {existing.legal_review_threshold_override?.toLocaleString() ?? '—'}</span>
                  <span>Escrow: {existing.escrow_deposit_pct_override != null ? `${existing.escrow_deposit_pct_override}%` : '—'}</span>
                  <span>Checklist: {existing.curation_checklist_override ?? '—'}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Using platform defaults</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
