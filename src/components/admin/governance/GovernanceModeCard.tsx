/**
 * GovernanceModeCard — Displays and edits governance behaviors for one mode.
 * Color-coded: QUICK=green, STRUCTURED=blue, CONTROLLED=purple.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withUpdatedBy } from '@/lib/auditFields';
import { handleMutationError } from '@/lib/errorHandler';
import { toast } from 'sonner';
import type { GovernanceModeConfigRow } from '@/hooks/queries/useGovernanceModeConfig';

const MODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  QUICK: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  STRUCTURED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  CONTROLLED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

interface GovernanceModeCardProps {
  config: GovernanceModeConfigRow;
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export function GovernanceModeCard({ config }: GovernanceModeCardProps) {
  const queryClient = useQueryClient();
  const colors = MODE_COLORS[config.governance_mode] ?? MODE_COLORS.STRUCTURED;
  const isQuick = config.governance_mode === 'QUICK';

  const [localConfig, setLocalConfig] = useState(config);
  const [isSaving, setIsSaving] = useState(false);

  const update = (key: keyof GovernanceModeConfigRow, value: boolean) => {
    setLocalConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = await withUpdatedBy({
        legal_doc_editable: localConfig.legal_doc_editable,
        legal_doc_creation_allowed: localConfig.legal_doc_creation_allowed,
        ai_legal_review_enabled: localConfig.ai_legal_review_enabled,
        ai_curation_review_required: localConfig.ai_curation_review_required,
        dual_curation_enabled: localConfig.dual_curation_enabled,
        dual_evaluation_required: localConfig.dual_evaluation_required,
        blind_evaluation: localConfig.blind_evaluation,
        dual_signoff_required: localConfig.dual_signoff_required,
      });

      const { error } = await supabase
        .from('md_governance_mode_config')
        .update(payload)
        .eq('governance_mode', config.governance_mode);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['governance-mode-config'] });
      toast.success(`${config.governance_mode} mode updated successfully`);
    } catch (err) {
      handleMutationError(err, { operation: 'update_governance_mode_config' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={`${colors.border} border-2`}>
      <CardHeader className={`${colors.bg} rounded-t-lg`}>
        <CardTitle className={`flex items-center gap-2 ${colors.text}`}>
          <Badge variant="outline" className={`${colors.text} ${colors.border}`}>
            {config.governance_mode}
          </Badge>
          {config.display_name ?? config.governance_mode}
        </CardTitle>
        {config.description && (
          <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-1 pt-4">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Legal (Phase 2)</h4>
        <ToggleRow label="Editable" description="Allow LC to edit legal docs" checked={localConfig.legal_doc_editable} disabled={isQuick} onChange={(v) => update('legal_doc_editable', v)} />
        <ToggleRow label="Custom Docs" description="Allow creating new legal docs" checked={localConfig.legal_doc_creation_allowed} disabled={isQuick} onChange={(v) => update('legal_doc_creation_allowed', v)} />
        <ToggleRow label="AI Legal Review" description="Enable AI-assisted legal review" checked={localConfig.ai_legal_review_enabled} onChange={(v) => update('ai_legal_review_enabled', v)} />

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Curation (Phase 3)</h4>
        <ToggleRow label="AI Review Required" description="Require AI curation review" checked={localConfig.ai_curation_review_required} onChange={(v) => update('ai_curation_review_required', v)} />
        <ToggleRow label="Dual Curation" description="Require two curators" checked={localConfig.dual_curation_enabled} disabled={isQuick} onChange={(v) => update('dual_curation_enabled', v)} />

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Evaluation (Phase 6/8)</h4>
        <ToggleRow label="Dual Evaluation" description="Require two evaluators" checked={localConfig.dual_evaluation_required} disabled={isQuick} onChange={(v) => update('dual_evaluation_required', v)} />
        <ToggleRow label="Blind Evaluation" description="Hide solver identity from reviewer" checked={localConfig.blind_evaluation} onChange={(v) => update('blind_evaluation', v)} />

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Award (Phase 9)</h4>
        <ToggleRow label="Dual Signoff" description="Require two approvals for award" checked={localConfig.dual_signoff_required} disabled={isQuick} onChange={(v) => update('dual_signoff_required', v)} />

        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-4">Escrow</h4>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Escrow Deposit %</Label>
            <p className="text-xs text-muted-foreground">Percentage of total fee required as escrow</p>
          </div>
          <Input
            type="number" min={0} max={100} step={1}
            className="w-20 text-right text-sm"
            value={localConfig.escrow_deposit_pct ?? 100}
            onChange={(e) => setLocalConfig((prev) => ({ ...prev, escrow_deposit_pct: Number(e.target.value) }))}
          />
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-full" size="sm">
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
