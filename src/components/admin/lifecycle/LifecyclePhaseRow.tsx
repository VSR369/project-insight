/**
 * LifecyclePhaseRow — Single editable row for lifecycle phase config.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2 } from 'lucide-react';
import type { LifecyclePhaseConfig } from '@/hooks/queries/useLifecyclePhaseConfig';
import { useUpdateLifecyclePhase } from '@/hooks/queries/useLifecyclePhaseConfig';

const ROLE_OPTIONS = [
  { value: '__none__', label: '—' },
  { value: 'CR', label: 'CR' },
  { value: 'CU', label: 'CU' },
  { value: 'ER', label: 'ER' },
  { value: 'LC', label: 'LC' },
  { value: 'FC', label: 'FC' },
];

const PHASE_TYPE_OPTIONS = [
  { value: 'seeker_manual', label: 'Manual' },
  { value: 'seeker_auto', label: 'Auto' },
  { value: 'solver_action', label: 'Solver' },
  { value: 'system_auto', label: 'System' },
  { value: 'parallel_compliance', label: 'Compliance' },
];

interface LifecyclePhaseRowProps {
  phase: LifecyclePhaseConfig;
}

export default function LifecyclePhaseRow({ phase }: LifecyclePhaseRowProps) {
  const [name, setName] = useState(phase.phase_name);
  const [requiredRole, setRequiredRole] = useState(phase.required_role ?? '__none__');
  const [secondaryRole, setSecondaryRole] = useState(phase.secondary_role ?? '__none__');
  const [phaseType, setPhaseType] = useState(phase.phase_type);
  const [autoComplete, setAutoComplete] = useState(phase.auto_complete);
  const [slaDays, setSlaDays] = useState(phase.sla_days ?? 0);

  const updateMutation = useUpdateLifecyclePhase();

  const isDirty =
    name !== phase.phase_name ||
    requiredRole !== (phase.required_role ?? '__none__') ||
    secondaryRole !== (phase.secondary_role ?? '__none__') ||
    phaseType !== phase.phase_type ||
    autoComplete !== phase.auto_complete ||
    slaDays !== (phase.sla_days ?? 0);

  const handleSave = () => {
    updateMutation.mutate({
      id: phase.id,
      phase_name: name,
      required_role: requiredRole === '__none__' ? null : requiredRole,
      secondary_role: secondaryRole === '__none__' ? null : secondaryRole,
      phase_type: phaseType,
      auto_complete: autoComplete,
      sla_days: slaDays,
    });
  };

  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      <td className="p-2 text-center font-mono text-sm">{phase.phase_number}</td>
      <td className="p-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
      </td>
      <td className="p-2">
        <Select value={requiredRole} onValueChange={setRequiredRole}>
          <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <Select value={secondaryRole} onValueChange={setSecondaryRole}>
          <SelectTrigger className="h-8 w-20 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-2">
        <Select value={phaseType} onValueChange={setPhaseType}>
          <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{PHASE_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="p-2 text-center">
        <Switch checked={autoComplete} onCheckedChange={setAutoComplete} />
      </td>
      <td className="p-2">
        <Input type="number" min={0} max={90} value={slaDays} onChange={(e) => setSlaDays(Number(e.target.value))} className="h-8 w-16 text-sm text-center" />
      </td>
      <td className="p-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave} disabled={!isDirty || updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </td>
    </tr>
  );
}
