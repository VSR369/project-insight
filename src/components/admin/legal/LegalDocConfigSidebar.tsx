/**
 * LegalDocConfigSidebar — Right panel with targeting, settings, and version history.
 */
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { LegalDocVersionHistory } from './LegalDocVersionHistory';
import type { LegalDocTemplate, AppliesModel, AppliesMode } from '@/types/legal.types';

interface LegalDocConfigSidebarProps {
  config: Partial<LegalDocTemplate>;
  onChange: (updates: Partial<LegalDocTemplate>) => void;
  templateId?: string;
}

export function LegalDocConfigSidebar({ config, onChange, templateId }: LegalDocConfigSidebarProps) {
  return (
    <div className="p-4 space-y-6">
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
