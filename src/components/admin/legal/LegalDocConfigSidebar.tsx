/**
 * LegalDocConfigSidebar — Right panel with document code, targeting, settings, and version history.
 */
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { LegalDocVersionHistory } from './LegalDocVersionHistory';
import { DOCUMENT_CODE_LABELS } from '@/types/legal.types';
import type { LegalDocTemplate, AppliesModel, AppliesMode, DocumentCode } from '@/types/legal.types';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'CR', label: 'Challenge Requester (CR)' },
  { value: 'CU', label: 'Curator (CU)' },
  { value: 'ER', label: 'Evaluator/Reviewer (ER)' },
  { value: 'LC', label: 'Legal Coordinator (LC)' },
  { value: 'FC', label: 'Finance Coordinator (FC)' },
  { value: 'SOLVER', label: 'Solution Provider' },
] as const;

const DOC_CODES = Object.keys(DOCUMENT_CODE_LABELS) as DocumentCode[];

interface LegalDocConfigSidebarProps {
  config: Partial<LegalDocTemplate>;
  onChange: (updates: Partial<LegalDocTemplate>) => void;
  templateId?: string;
  isNew?: boolean;
}

export function LegalDocConfigSidebar({ config, onChange, templateId, isNew }: LegalDocConfigSidebarProps) {
  const selectedRoles = config.applies_to_roles ?? ['ALL'];

  const handleRoleToggle = (role: string, checked: boolean) => {
    if (role === 'ALL') {
      onChange({ applies_to_roles: checked ? ['ALL'] : [] });
      return;
    }
    const current = selectedRoles.filter((r) => r !== 'ALL');
    const updated = checked ? [...current, role] : current.filter((r) => r !== role);
    onChange({ applies_to_roles: updated.length === 0 ? ['ALL'] : updated });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Document Code */}
      <div className="space-y-2">
        <Label>Document Code</Label>
        {isNew ? (
          <Select
            value={config.document_code ?? 'PMA'}
            onValueChange={(v) => onChange({ document_code: v as DocumentCode })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOC_CODES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c} — {DOCUMENT_CODE_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant="secondary" className="text-sm">
            {config.document_code ?? '—'} — {config.document_code ? DOCUMENT_CODE_LABELS[config.document_code as DocumentCode] : ''}
          </Badge>
        )}
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="doc-name">Document Name</Label>
        <Input
          id="doc-name"
          value={config.document_name ?? ''}
          onChange={(e) => onChange({ document_name: e.target.value })}
          placeholder="Document name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="doc-description">Description</Label>
        <Textarea
          id="doc-description"
          value={config.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Purpose and scope of this document"
          rows={3}
        />
      </div>

      <Separator />

      {/* Targeting */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Targeting</h3>

        <div className="space-y-2">
          <Label>Applies to Model</Label>
          <Select
            value={config.applies_to_model ?? 'BOTH'}
            onValueChange={(v) => onChange({ applies_to_model: v as AppliesModel })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MARKETPLACE">Marketplace</SelectItem>
              <SelectItem value="AGGREGATOR">Aggregator</SelectItem>
              <SelectItem value="BOTH">Both</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Applies to Mode</Label>
          <Select
            value={config.applies_to_mode ?? 'ALL'}
            onValueChange={(v) => onChange({ applies_to_mode: v as AppliesMode })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="QUICK">Quick</SelectItem>
              <SelectItem value="STRUCTURED">Structured</SelectItem>
              <SelectItem value="CONTROLLED">Controlled</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Applies to Roles</Label>
          <div className="space-y-2 rounded-md border p-3">
            {ROLE_OPTIONS.map((role) => (
              <div key={role.value} className="flex items-center gap-2">
                <Checkbox
                  id={`role-${role.value}`}
                  checked={selectedRoles.includes(role.value)}
                  onCheckedChange={(checked) => handleRoleToggle(role.value, checked === true)}
                />
                <label htmlFor={`role-${role.value}`} className="text-sm cursor-pointer">
                  {role.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Settings */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Settings</h3>

        <div className="flex items-center justify-between">
          <Label htmlFor="mandatory">Mandatory</Label>
          <Switch
            id="mandatory"
            checked={config.is_mandatory ?? true}
            onCheckedChange={(v) => onChange({ is_mandatory: v })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="effective-date">Effective Date</Label>
          <Input
            id="effective-date"
            type="date"
            value={config.effective_date ?? ''}
            onChange={(e) => onChange({ effective_date: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="summary">Summary (max 200 chars)</Label>
          <Textarea
            id="summary"
            value={config.summary ?? ''}
            onChange={(e) => onChange({ summary: e.target.value.slice(0, 200) })}
            placeholder="Short description shown before full document"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">
            {(config.summary ?? '').length}/200
          </p>
        </div>
      </div>

      <Separator />

      {/* Version History */}
      {templateId && <LegalDocVersionHistory templateId={templateId} />}
    </div>
  );
}
