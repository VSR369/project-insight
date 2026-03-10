/**
 * ConfigParamRow — Inline editable parameter row for SCR-07-01.
 * Supports INTEGER/DECIMAL inputs and UUID admin picker (GAP-8).
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, X, Check, Info, AlertTriangle } from 'lucide-react';
import { useUpdateConfig } from '@/hooks/queries/useUpdateConfig';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import type { MpaConfigEntry } from '@/hooks/queries/useMpaConfig';

/** Enum-style options for TEXT params with fixed valid values */
const ENUM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  org_verification_assignment_mode: [
    { value: 'open_claim', label: 'Open Claim (First-Come-First-Served)' },
    { value: 'auto_assign', label: 'Auto-Assignment (Scoring Engine)' },
  ],
  platform_admin_tier_depth: [
    { value: '1', label: 'Supervisor Only (Single Operator)' },
    { value: '2', label: 'Supervisor + Senior Admin' },
    { value: '3', label: 'Full Hierarchy (Supervisor + Senior + Admin)' },
  ],
  org_admin_delegation_enabled: [
    { value: 'true', label: 'Enabled — PRIMARY + DELEGATED seeking org admins' },
    { value: 'false', label: 'Disabled — PRIMARY seeking org admin only' },
  ],
};

interface ConfigParamRowProps {
  entry: MpaConfigEntry;
  adminNameMap?: Record<string, string>;
}

/** Fetch available admins for UUID picker */
function useAdminOptions() {
  return useQuery({
    queryKey: ['admin-profiles-uuid-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_admin_profiles')
        .select('id, full_name, admin_tier')
        .order('full_name');
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function ConfigParamRow({ entry, adminNameMap }: ConfigParamRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry.param_value ?? '');
  const [reason, setReason] = useState('');
  const updateConfig = useUpdateConfig();
  const isUuidType = entry.param_type === 'UUID';
  const enumOptions = ENUM_OPTIONS[entry.param_key];
  const isEnumType = !!enumOptions;
  const { data: adminOptions } = useAdminOptions();

  const handleSave = () => {
    updateConfig.mutate(
      { paramKey: entry.param_key, newValue: editValue || null, changeReason: reason || undefined },
      {
        onSuccess: () => {
          setIsEditing(false);
          setReason('');
        },
      }
    );
  };

  const handleCancel = () => {
    setEditValue(entry.param_value ?? '');
    setReason('');
    setIsEditing(false);
  };

  const updatedByName = entry.updated_by_id && adminNameMap ? adminNameMap[entry.updated_by_id] : null;

  // Resolve UUID display name
  const displayValue = isUuidType && entry.param_value
    ? (adminNameMap?.[entry.param_value] ??
       adminOptions?.find((a) => a.id === entry.param_value)?.full_name ??
       entry.param_value)
    : isEnumType && entry.param_value
      ? (enumOptions.find((o) => o.value === entry.param_value)?.label ?? entry.param_value)
      : (entry.param_value ?? 'NULL');

  return (
    <div className="flex flex-col gap-2 py-3 px-1 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-sm text-foreground">{entry.label || entry.param_key}</span>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{entry.description}</p>
              <p className="text-xs text-muted-foreground mt-1">Key: {entry.param_key}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {entry.is_critical && (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
            <AlertTriangle className="h-3 w-3 mr-0.5" />
            Critical
          </Badge>
        )}

        {!isEditing && (
          <>
            <Badge variant="secondary" className="text-xs font-mono">
              {displayValue}{entry.unit ? ` ${entry.unit}` : ''}
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {isEditing && (
        <div className="flex flex-col gap-2 pl-2 border-l-2 border-primary/30 ml-1">
          <div className="flex items-center gap-2">
            {isUuidType ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger className="w-64 h-8 text-sm">
                  <SelectValue placeholder="Select admin..." />
                </SelectTrigger>
                <SelectContent>
                  {(adminOptions ?? []).map((admin) => (
                    <SelectItem key={admin.id} value={admin.id}>
                      {admin.full_name} ({admin.admin_tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : isEnumType ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger className="w-72 h-8 text-sm">
                  <SelectValue placeholder="Select option..." />
                </SelectTrigger>
                <SelectContent>
                  {enumOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={entry.param_type === 'INTEGER' || entry.param_type === 'DECIMAL' ? 'number' : 'text'}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-32 h-8 text-sm"
                min={entry.min_value ?? undefined}
                max={entry.max_value ?? undefined}
              />
            )}
            {entry.unit && <span className="text-xs text-muted-foreground">{entry.unit}</span>}
            {entry.min_value && entry.max_value && (
              <span className="text-xs text-muted-foreground">
                ({entry.min_value}–{entry.max_value})
              </span>
            )}
          </div>
          <Textarea
            placeholder="Change reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="text-xs h-16 resize-none"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={updateConfig.isPending}>
              <Check className="h-3 w-3 mr-1" />
              {updateConfig.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancel}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {entry.updated_at && (
        <p className="text-xs text-muted-foreground">
          Last changed: {updatedByName ?? 'System'} — {formatDistanceToNow(new Date(entry.updated_at), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}
